const db = require('../config/db');
const { calcStatus } = require('../utils/status');

async function getServices(req, res) {
  let { shift_id, date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date es requerido' });
  }

  // Normalizar fecha (si viene MM/DD/YYYY convertir a YYYY-MM-DD)
  if (date.includes('/')) {
    const parts = date.split('/');
    if (parts[0].length === 2 && parts[2].length === 4) {
      // Parece MM/DD/YYYY
      date = `${parts[2]}-${parts[0]}-${parts[1]}`;
    } else if (parts[2].length === 2 && parts[0].length === 4) {
      // Parece YYYY/MM/DD
      date = `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
  }

  const page   = parseInt(req.query.page)  || 1;
  const limit  = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE ts.date = ? AND r.is_active = TRUE';
    const params = [date];

    if (shift_id) {
      whereClause += ' AND ts.shift_id = ?';
      params.push(shift_id);
    }

    // Cuenta total para paginación
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM transport_services ts JOIN routes r ON r.id = ts.route_id ${whereClause}`,
      params
    );

    const [rows] = await db.query(
      `SELECT
         ts.id           AS service_id,
         r.id            AS route_id,
         r.name          AS route_name,
         vt.capacity,
         vt.min_required,
         ts.current_load,
         sh.name         AS shift,
         DATE_FORMAT(ts.date, '%Y-%m-%d') AS date
       FROM transport_services ts
       JOIN routes r         ON r.id  = ts.route_id
       JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
       JOIN shifts sh        ON sh.id = ts.shift_id
       ${whereClause}
       ORDER BY ts.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const result = rows.map(row => ({
      service_id:   row.service_id,
      route_id:     row.route_id,
      route_name:   row.route_name,
      capacity:     row.capacity,
      current_load: row.current_load,
      min_required: row.min_required,
      status:       calcStatus(row.current_load, row.capacity, row.min_required),
      shift:        row.shift,
      date:         row.date,
    }));

    return res.json({
      data: result,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function createService(req, res) {
  const { route_id, shift_id, date } = req.body;
  if (!route_id || !shift_id || !date) {
    return res.status(400).json({ error: 'route_id, shift_id y date son requeridos' });
  }

  try {
    // 1. Validar que la ruta exista y esté activa
    const [[route]] = await db.query('SELECT id FROM routes WHERE id = ? AND is_active = TRUE', [route_id]);
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada o inactiva' });

    // 2. Validar que el turno exista
    const [[shift]] = await db.query('SELECT id FROM shifts WHERE id = ?', [shift_id]);
    if (!shift) return res.status(404).json({ error: 'Turno no encontrado' });

    // 3. Crear el servicio (INSERT IGNORE evita duplicados para la misma combinación)
    const [result] = await db.query(
      'INSERT IGNORE INTO transport_services (route_id, shift_id, date) VALUES (?, ?, ?)',
      [route_id, shift_id, date]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'Este servicio ya se encuentra activo para esta fecha y turno' });
    }

    return res.status(201).json({
      service_id: result.insertId,
      message: 'Servicio (unión ruta-turno) activado correctamente',
      data: { route_id, shift_id, date }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

module.exports = { getServices, createService };