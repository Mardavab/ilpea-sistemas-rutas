const db = require('../config/db');

async function addStop(req, res) {
  const { id: route_id } = req.params;
  const { name, order_index } = req.body;
  if (!name || order_index === undefined) {
    return res.status(400).json({ error: 'name y order_index son requeridos', code: 'VALIDATION_ERROR', status: 400 });
  }

  try {
    const [[route]] = await db.query('SELECT id FROM routes WHERE id = ?', [route_id]);
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND', status: 404 });

    const [result] = await db.query(
      'INSERT INTO stops (route_id, name, order_index) VALUES (?, ?, ?)', [route_id, name, order_index]
    );
    return res.status(201).json({ id: result.insertId, route_id: parseInt(route_id), name, order_index });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function updateStop(req, res) {
  const { id } = req.params;
  const { name, order_index } = req.body;

  try {
    const [[stop]] = await db.query('SELECT * FROM stops WHERE id = ?', [id]);
    if (!stop) return res.status(404).json({ error: 'Parada no encontrada', code: 'NOT_FOUND', status: 404 });

    const fields = [];
    const values = [];
    if (name)                  { fields.push('name = ?');        values.push(name); }
    if (order_index !== undefined) { fields.push('order_index = ?'); values.push(order_index); }

    if (fields.length) {
      values.push(id);
      await db.query(`UPDATE stops SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const [[updated]] = await db.query('SELECT id, name, order_index FROM stops WHERE id = ?', [id]);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function deleteStop(req, res) {
  const { id } = req.params;
  try {
    const [[stop]] = await db.query('SELECT * FROM stops WHERE id = ?', [id]);
    if (!stop) return res.status(404).json({ error: 'Parada no encontrada', code: 'NOT_FOUND', status: 404 });

    // Check for active assignments
    const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM assignments WHERE stop_id = ?', [id]);
    if (count > 0) {
      return res.status(409).json({ error: 'La parada tiene asignaciones activas', code: 'CONFLICT', status: 409 });
    }

    await db.query('DELETE FROM stops WHERE id = ?', [id]);
    return res.json({ message: 'Parada eliminada correctamente' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

module.exports = { addStop, updateStop, deleteStop };
