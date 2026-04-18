const db = require('../config/db');

// ── NUEVO: Listar asignaciones con nombres reales ─────────────────────
// GET /api/assignments?shift_id=1&date=2026-04-18
// Devuelve las asignaciones con nombre del empleado, ruta, parada y turno
// para que el frontend nunca tenga que mostrar IDs crudos.
async function listAssignments(req, res) {
  const { shift_id, date } = req.query;

  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Construimos la query base; shift_id y date son opcionales como filtros
  let whereClauses = 'WHERE r.is_active = TRUE';
  const params = [];

  if (shift_id) {
    whereClauses += ' AND ts.shift_id = ?';
    params.push(shift_id);
  }
  if (date) {
    whereClauses += ' AND ts.date = ?';
    params.push(date);
  }

  const sql = `
    SELECT
      a.id,
      e.id    AS employee_id,
      e.name  AS employee_name,
      e.email AS employee_email,
      ts.id   AS service_id,
      r.name  AS route_name,
      r.is_active,
      st.id   AS stop_id,
      st.name AS stop_name,
      sh.name AS shift,
      DATE_FORMAT(ts.date, '%Y-%m-%d') AS date,
      a.seat_number
    FROM assignments a
    JOIN employees          e  ON e.id  = a.employee_id
    JOIN transport_services ts ON ts.id = a.service_id
    JOIN routes             r  ON r.id  = ts.route_id
    JOIN stops              st ON st.id = a.stop_id
    JOIN shifts             sh ON sh.id = ts.shift_id
    ${whereClauses}
    ORDER BY ts.date DESC, e.name ASC
    LIMIT ? OFFSET ?`;

  try {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM assignments a JOIN transport_services ts ON ts.id = a.service_id JOIN routes r ON r.id = ts.route_id ${whereClauses}`, params);
    const [rows] = await db.query(sql, [...params, limit, offset]);
    
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

// ── Crear asignación ──────────────────────────────────────────────────
async function createAssignment(req, res) {
  const { employee_id, service_id, stop_id, seat_number } = req.body;
  if (!employee_id || !service_id || !stop_id || !seat_number) {
    return res.status(400).json({
      error: 'employee_id, service_id, stop_id y seat_number son requeridos',
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // NUEVO: Validar que el usuario sea un EMPLOYEE
    const [[emp]] = await conn.query('SELECT role FROM employees WHERE id = ?', [employee_id]);
    if (!emp || emp.role !== 'EMPLOYEE') {
      await conn.rollback();
      return res.status(403).json({ error: 'Solo se pueden asignar empleados operativos (vendedores/repartidores)', code: 'FORBIDDEN', status: 403 });
    }

    // Verifica que el servicio exista y tenga capacidad (capacity desde vehicle_types)
    const [[svc]] = await conn.query(
      `SELECT ts.id, ts.current_load, vt.capacity
       FROM transport_services ts
       JOIN routes r         ON r.id  = ts.route_id
       JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
       WHERE ts.id = ? AND r.is_active = TRUE`,
      [service_id]
    );
    if (!svc) {
      await conn.rollback();
      return res.status(404).json({ error: 'Servicio no encontrado o ruta inactiva', code: 'NOT_FOUND', status: 404 });
    }
    if (svc.current_load >= svc.capacity) {
      await conn.rollback();
      return res.status(409).json({ error: 'El servicio está lleno', code: 'CONFLICT', status: 409 });
    }

    // Verifica si el asiento está ocupado
    const [[occupied]] = await conn.query(
      'SELECT id FROM assignments WHERE service_id = ? AND seat_number = ?',
      [service_id, seat_number]
    );
    if (occupied) {
      await conn.rollback();
      return res.status(409).json({ error: 'El asiento ya está ocupado', code: 'CONFLICT', status: 409 });
    }

    // Verifica que el empleado no tenga ya una asignación en este mismo servicio
    const [[dup]] = await conn.query(
      'SELECT id FROM assignments WHERE employee_id = ? AND service_id = ?',
      [employee_id, service_id]
    );
    if (dup) {
      await conn.rollback();
      return res.status(409).json({ error: 'El empleado ya está asignado a este servicio', code: 'CONFLICT', status: 409 });
    }

    const [result] = await conn.query(
      'INSERT INTO assignments (employee_id, service_id, stop_id, seat_number) VALUES (?, ?, ?, ?)',
      [employee_id, service_id, stop_id, seat_number]
    );
    await conn.query(
      'UPDATE transport_services SET current_load = current_load + 1 WHERE id = ?',
      [service_id]
    );
    await conn.commit();

    return res.status(201).json({
      id: result.insertId,
      employee_id,
      service_id,
      stop_id,
      seat_number,
      message: 'Asignación creada exitosamente',
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  } finally {
    conn.release();
  }
}

// ── Actualizar asignación ─────────────────────────────────────────────
async function updateAssignment(req, res) {
  const { id } = req.params;
  const { service_id, stop_id, seat_number } = req.body;
  if (!service_id || !stop_id || !seat_number) {
    return res.status(400).json({
      error: 'service_id, stop_id y seat_number son requeridos',
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[asgn]] = await conn.query('SELECT * FROM assignments WHERE id = ?', [id]);
    if (!asgn) {
      await conn.rollback();
      return res.status(404).json({ error: 'Asignación no encontrada', code: 'NOT_FOUND', status: 404 });
    }

    // Si cambia de servicio, decrementamos el anterior
    if (asgn.service_id !== service_id) {
      await conn.query(
        'UPDATE transport_services SET current_load = GREATEST(current_load - 1, 0) WHERE id = ?',
        [asgn.service_id]
      );
    }

    // Validar el nuevo asiento/servicio
    const [[occ]] = await conn.query(
      'SELECT id FROM assignments WHERE service_id = ? AND seat_number = ? AND id != ?',
      [service_id, seat_number, id]
    );
    if (occ) {
      await conn.rollback();
      return res.status(409).json({ error: 'El asiento ya está ocupado', code: 'CONFLICT', status: 409 });
    }

    // Verifica el nuevo servicio (capacity desde vehicle_types)
    const [[newSvc]] = await conn.query(
      `SELECT ts.id, ts.current_load, vt.capacity
       FROM transport_services ts
       JOIN routes r         ON r.id  = ts.route_id
       JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
       WHERE ts.id = ? AND r.is_active = TRUE`,
      [service_id]
    );
    if (!newSvc) {
      await conn.rollback();
      return res.status(404).json({ error: 'Servicio destino no encontrado o ruta inactiva', code: 'NOT_FOUND', status: 404 });
    }
    if (newSvc.current_load >= newSvc.capacity && asgn.service_id !== service_id) {
      await conn.rollback();
      return res.status(409).json({ error: 'El servicio destino está lleno', code: 'CONFLICT', status: 409 });
    }

    await conn.query(
      'UPDATE assignments SET service_id = ?, stop_id = ?, seat_number = ? WHERE id = ?',
      [service_id, stop_id, seat_number, id]
    );

    if (asgn.service_id !== service_id) {
      await conn.query(
        'UPDATE transport_services SET current_load = current_load + 1 WHERE id = ?',
        [service_id]
      );
    }

    await conn.commit();

    return res.json({ id: parseInt(id), service_id, stop_id, seat_number, message: 'Asignación actualizada' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  } finally {
    conn.release();
  }
}

// ── Eliminar asignación ───────────────────────────────────────────────
async function deleteAssignment(req, res) {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[asgn]] = await conn.query('SELECT * FROM assignments WHERE id = ?', [id]);
    if (!asgn) {
      await conn.rollback();
      return res.status(404).json({ error: 'Asignación no encontrada', code: 'NOT_FOUND', status: 404 });
    }

    await conn.query('DELETE FROM assignments WHERE id = ?', [id]);
    await conn.query(
      'UPDATE transport_services SET current_load = GREATEST(current_load - 1, 0) WHERE id = ?',
      [asgn.service_id]
    );
    await conn.commit();

    return res.json({ message: 'Asignación eliminada correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
  } finally {
    conn.release();
  }
}

async function getOccupiedSeats(req, res) {
  const { service_id } = req.params;
  try {
    const [rows] = await db.query('SELECT seat_number FROM assignments WHERE service_id = ?', [service_id]);
    const occupied = rows.map(r => r.seat_number);
    return res.json({ occupied });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener asientos ocupados' });
  }
}

module.exports = { listAssignments, createAssignment, updateAssignment, deleteAssignment, getOccupiedSeats };