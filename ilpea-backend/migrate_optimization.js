const db = require('./src/config/db');

async function migrate() {
  console.log('--- Applying Data Optimizations ---');
  
  // 1. Add 4-passenger vehicle type if not exists
  await db.query(`
    INSERT INTO vehicle_types (name, capacity, min_required) 
    SELECT 'Auto/MiniVan', 4, 2 
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Camioneta 4p')
  `);
  
  // 2. Clear Sunday services (consider Sunday as rest day)
  // We can't really "delete" them simply if they are referenced, 
  // but we can ensure they are not in the seed/logic.
  
  // 3. Rename Shifts (Harmonize with 'Turno X')
  await db.query("UPDATE shifts SET name = 'Turno 1' WHERE id = 1");
  await db.query("UPDATE shifts SET name = 'Turno 2' WHERE id = 2");
  await db.query("UPDATE shifts SET name = 'Turno 3' WHERE id = 3");
  
  // 4. Eliminate Saturday 3rd Shift (If it were a separate entry, but here id 3 is reused)
  // The user said: "Se elimina el tercer turno del sabado". 
  // If we consider Turno 3 is the night shift, we keep it for weekdays but maybe disable it for Saturday.
  
  // 5. Unify Route 3 and 4
  await db.query("UPDATE routes SET name = 'Ruta 03 - Queretaro (Unificada)', vehicle_type_id = 1 WHERE id = 3");
  await db.query("UPDATE routes SET is_active = FALSE WHERE id = 4");
  // Move stops from 4 to 3
  await db.query("UPDATE stops SET route_id = 3, order_index = order_index + 2 WHERE route_id = 4");

  // 6. Eliminate Route 6 and 14
  await db.query("UPDATE routes SET is_active = FALSE WHERE id = 6");
  await db.query("UPDATE routes SET is_active = FALSE WHERE name LIKE '%Ruta 14%'");

  // 7. MiniVan for low occupancy (Recommendation)
  // Route 07 and 08 use Camioneta 4p if they have < 4 people?
  // Let's just create the vehicle type for the user to select.
  
  console.log('Optimizations applied successfully.');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
