const db = require('./src/config/db');

async function test() {
  console.log('--- Testing Employee Profile with Inactive Route ---');
  // 1. Deactivate all routes
  await db.query('UPDATE routes SET is_active = FALSE');
  
  // 2. Mock a request to getMe for employee id 3 (Juan Perez in seeds)
  // We need to simulate the authenticate middleware setting req.user.id
  // But here we'll just run the query logic.
  const today = new Date().toISOString().split('T')[0];
  const [rows] = await db.query(
    `SELECT
       e.id, e.name, e.email, e.role,
       sh.name                                    AS shift_name,
       r.name                                     AS route_name,
       st.name                                    AS stop_name,
       CONCAT(sh.start_time, ' - ', sh.end_time) AS schedule,
       ts.date
     FROM employees e
     LEFT JOIN assignments a        ON a.employee_id = e.id
     LEFT JOIN transport_services ts ON ts.id = a.service_id AND ts.date = ?
     LEFT JOIN shifts sh             ON sh.id = ts.shift_id
     LEFT JOIN routes r              ON r.id  = ts.route_id AND r.is_active = TRUE
     LEFT JOIN stops st              ON st.id = a.stop_id
     WHERE e.id = ?
     ORDER BY (ts.date IS NOT NULL) DESC
     LIMIT 1`,
    [today, 3]
  );
  
  const row = rows[0];
  console.log('Employee Row:', row);
  const hasActiveAssignment = row.shift_name && row.route_name;
  console.log('Has Active Assignment (should be false if route is inactive):', !!hasActiveAssignment);
  
  console.log('\n--- Testing Manager Assignment List ---');
  const [asgnRows] = await db.query(`
    SELECT a.id, r.name AS route_name, r.is_active
    FROM assignments a
    JOIN transport_services ts ON ts.id = a.service_id
    JOIN routes r ON r.id = ts.route_id
    WHERE r.is_active = TRUE
  `);
  console.log('Active Assignments Count (should be 0):', asgnRows.length);

  // Restore routes
  await db.query('UPDATE routes SET is_active = TRUE');
  console.log('\nRoutes restored.');
  
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
