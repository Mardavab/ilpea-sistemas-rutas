const db = require('../config/db');

async function listShifts(req, res) {
  try {
    const [rows] = await db.query('SELECT id, name, start_time, end_time FROM shifts ORDER BY id');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

module.exports = { listShifts };
