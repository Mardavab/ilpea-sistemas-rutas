const db = require('../config/db');

async function listRoutes(req, res) {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM routes');
    const [routes] = await db.query(
      `SELECT r.id, r.name, r.vehicle_type_id, vt.capacity, vt.min_required, r.is_active
       FROM routes r
       JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
       ORDER BY r.id
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [stops] = await db.query('SELECT * FROM stops ORDER BY route_id, order_index');
    const stopsByRoute = stops.reduce((acc, s) => {
      (acc[s.route_id] ||= []).push({ id: s.id, name: s.name, order_index: s.order_index });
      return acc;
    }, {});

    return res.json({
      data: routes.map(r => ({ ...r, stops: stopsByRoute[r.id] || [] })),
      total,
      page,
      limit
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function createRoute(req, res) {
  const { name, vehicle_type_id, stops = [] } = req.body;
  if (!name || !vehicle_type_id) {
    return res.status(400).json({ error: 'name y vehicle_type_id son requeridos', code: 'VALIDATION_ERROR', status: 400 });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO routes (name, vehicle_type_id) VALUES (?, ?)', [name, vehicle_type_id]
    );
    const routeId = result.insertId;

    for (const stop of stops) {
      await conn.query('INSERT INTO stops (route_id, name, order_index) VALUES (?, ?, ?)',
        [routeId, stop.name, stop.order_index]);
    }

    await conn.commit();

    const [[vt]] = await conn.query('SELECT capacity, min_required FROM vehicle_types WHERE id = ?', [vehicle_type_id]);
    return res.status(201).json({ id: routeId, name, capacity: vt.capacity, min_required: vt.min_required, is_active: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  } finally {
    conn.release();
  }
}

async function updateRoute(req, res) {
  const { id } = req.params;
  const { name, vehicle_type_id } = req.body;

  try {
    const [[route]] = await db.query('SELECT id FROM routes WHERE id = ?', [id]);
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND', status: 404 });

    const fields = [];
    const values = [];
    if (name)            { fields.push('name = ?');            values.push(name); }
    if (vehicle_type_id) { fields.push('vehicle_type_id = ?'); values.push(vehicle_type_id); }

    if (fields.length) {
      values.push(id);
      await db.query(`UPDATE routes SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const [[updated]] = await db.query(
      `SELECT r.id, r.name, r.vehicle_type_id, vt.capacity, vt.min_required, r.is_active
       FROM routes r JOIN vehicle_types vt ON vt.id = r.vehicle_type_id WHERE r.id = ?`, [id]
    );
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function updateRouteStatus(req, res) {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active debe ser boolean', code: 'VALIDATION_ERROR', status: 400 });
  }

  try {
    const [[route]] = await db.query('SELECT id FROM routes WHERE id = ?', [id]);
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND', status: 404 });

    await db.query('UPDATE routes SET is_active = ? WHERE id = ?', [is_active, id]);
    return res.json({ id: parseInt(id), is_active, message: `Ruta ${is_active ? 'activada' : 'desactivada'} correctamente` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

module.exports = { listRoutes, createRoute, updateRoute, updateRouteStatus };
