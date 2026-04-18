const db = require('../config/db');
const { calcStatus } = require('../utils/status');

async function getOverview(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
         ts.id, ts.current_load, vt.capacity, vt.min_required
       FROM transport_services ts
       JOIN routes r         ON r.id  = ts.route_id
       JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
       WHERE r.is_active = TRUE AND ts.date = CURDATE()`
    );

    const [[{ total_routes }]]  = await db.query('SELECT COUNT(*) AS total_routes FROM routes WHERE is_active = TRUE');
    const [[{ total_assigned }]] = await db.query(
      `SELECT COUNT(*) AS total_assigned FROM assignments a
       JOIN transport_services ts ON ts.id = a.service_id
       JOIN routes r ON r.id = ts.route_id
       WHERE r.is_active = TRUE AND ts.date = CURDATE()`
    );

    let activeCount  = 0;
    let criticalCount = 0;
    let totalOcc = 0;

    for (const row of rows) {
      const status = calcStatus(row.current_load, row.capacity, row.min_required);
      if (status === 'ACTIVA' || status === 'LLENA') activeCount++;
      if (status === 'NO_VIABLE') criticalCount++;
      totalOcc += row.capacity > 0 ? (row.current_load / row.capacity) * 100 : 0;
    }

    const avg = rows.length > 0 ? Math.round(totalOcc / rows.length) : 0;

    return res.json({
      total_routes:              parseInt(total_routes),
      active_routes:             activeCount,
      critical_routes:           criticalCount,
      avg_occupancy_percent:     avg,
      total_employees_assigned:  parseInt(total_assigned),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function getDashboardServices(req, res) {
  const { shift_id } = req.query;
  const whereShift = shift_id ? 'AND ts.shift_id = ?' : '';
  const params = shift_id ? [shift_id] : [];

  try {
    const [rows] = await db.query(
      `SELECT
         r.name        AS route,
         sh.name       AS shift,
         ts.current_load AS occupancy,
         vt.capacity,
         vt.min_required
       FROM transport_services ts
       JOIN routes r         ON r.id  = ts.route_id
       JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
       JOIN shifts sh        ON sh.id = ts.shift_id
       WHERE r.is_active = TRUE ${whereShift} AND ts.date = CURDATE()`,
      params
    );

    const result = rows.map(row => ({
      route:             row.route,
      shift:             row.shift,
      occupancy:         row.occupancy,
      capacity:          row.capacity,
      occupancy_percent: row.capacity > 0 ? Math.round((row.occupancy / row.capacity) * 100) : 0,
      status:            calcStatus(row.occupancy, row.capacity, row.min_required),
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

module.exports = { getOverview, getDashboardServices };
