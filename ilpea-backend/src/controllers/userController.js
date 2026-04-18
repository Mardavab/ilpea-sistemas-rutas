const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function listUsers(req, res) {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const roleFilter = req.user.role === 'MANAGER' ? "WHERE role = 'EMPLOYEE'" : '';
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM employees ${roleFilter}`);
    const [rows] = await db.query(
      `SELECT id, name, email, role, address FROM employees ${roleFilter} ORDER BY id LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return res.json({
      data: rows,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function createUser(req, res) {
  const { name, email, password, role, address } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password y role son requeridos', code: 'VALIDATION_ERROR', status: 400 });
  }

  // MANAGERs can only create EMPLOYEE
  if (req.user.role === 'MANAGER' && role !== 'EMPLOYEE') {
    return res.status(403).json({ error: 'Encargados solo pueden crear empleados', code: 'FORBIDDEN', status: 403 });
  }

  const validRoles = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido', code: 'VALIDATION_ERROR', status: 400 });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO employees (name, email, password_hash, role, address) VALUES (?, ?, ?, ?, ?)',
      [name, email, password_hash, role, address || null]
    );
    return res.status(201).json({ id: result.insertId, name, email, role, address });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya existe', code: 'CONFLICT', status: 409 });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role, address } = req.body;

  try {
    const [[target]] = await db.query('SELECT id, role FROM employees WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado', code: 'NOT_FOUND', status: 404 });

    if (req.user.role === 'MANAGER' && target.role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Encargados solo pueden modificar empleados', code: 'FORBIDDEN', status: 403 });
    }

    const fields = [];
    const values = [];
    if (name)    { fields.push('name = ?');    values.push(name); }
    if (email)   { fields.push('email = ?');   values.push(email); }
    if (address !== undefined) { fields.push('address = ?'); values.push(address); }
    if (role && req.user.role === 'ADMIN') { fields.push('role = ?'); values.push(role); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar', code: 'VALIDATION_ERROR', status: 400 });
    }

    values.push(id);
    await db.query(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values);

    const [[updated]] = await db.query('SELECT id, name, email, role, address FROM employees WHERE id = ?', [id]);
    return res.json(updated);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya existe', code: 'CONFLICT', status: 409 });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    const [[target]] = await db.query('SELECT id, role FROM employees WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado', code: 'NOT_FOUND', status: 404 });

    if (req.user.role === 'MANAGER' && target.role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Encargados solo pueden eliminar empleados', code: 'FORBIDDEN', status: 403 });
    }

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo', code: 'VALIDATION_ERROR', status: 400 });
    }

    await db.query('DELETE FROM employees WHERE id = ?', [id]);
    return res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
