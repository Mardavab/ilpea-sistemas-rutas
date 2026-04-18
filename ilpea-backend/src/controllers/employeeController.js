const db = require('../config/db');

async function getMe(req, res) {
  try {
    // Usamos la fecha de HOY para no mostrar asignaciones pasadas.
    // También verificamos que la ruta del servicio esté activa.
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const [rows] = await db.query(
      `SELECT
         e.id, e.name, e.email, e.role,
         a.seat_number,
         sh.name                                    AS shift_name,
         r.name                                     AS route_name,
         st.name                                    AS stop_name,
         CONCAT(TIME_FORMAT(sh.start_time, '%H:%i'), ' - ', TIME_FORMAT(sh.end_time, '%H:%i')) AS schedule,
         DATE_FORMAT(ts.date, '%Y-%m-%d') AS date
       FROM employees e
       LEFT JOIN assignments a        ON a.employee_id = e.id
       LEFT JOIN transport_services ts ON ts.id = a.service_id AND ts.date = ?
       LEFT JOIN shifts sh             ON sh.id = ts.shift_id
       LEFT JOIN routes r              ON r.id  = ts.route_id AND r.is_active = TRUE
       LEFT JOIN stops st              ON st.id = a.stop_id
       WHERE e.id = ?
       ORDER BY (ts.date IS NOT NULL) DESC
       LIMIT 1`,
      [today, req.user.id]
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Usuario no encontrado', code: 'NOT_FOUND', status: 404 });
    }

    // Si route_name es NULL significa que la ruta fue desactivada o no hay
    // asignación para hoy → devolvemos assignment: null
    const hasActiveAssignment = row.shift_name && row.route_name;

    return res.json({
      id:    row.id,
      name:  row.name,
      email: row.email,
      role:  row.role,
      assignment: hasActiveAssignment ? {
        shift:    row.shift_name,
        route:    row.route_name,
        stop:     row.stop_name,
        schedule: row.schedule,
        date:     row.date,
        seat:     row.seat_number
      } : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

module.exports = { getMe };