const db = require('./src/config/db');

async function robustSeed() {
  console.log('--- Cleaning and Seeding Optimized Data ---');
  
  // 1. Deactivate routes that should not be active
  // Routes to ELIMINATE: 4, 6, 10, 11, 14
  await db.query("UPDATE routes SET is_active = FALSE"); // Reset all
  await db.query("UPDATE routes SET is_active = TRUE WHERE id IN (1, 2, 3, 5, 7, 8, 9)");
  await db.query("UPDATE routes SET name = 'Ruta 03 - Queretaro (Unificada)' WHERE id = 3");
  
  // 2. Clean upcoming services to avoid duplicates and mismatches
  await db.query("DELETE FROM transport_services WHERE date >= '2026-04-01'");

  const [activeRoutes] = await db.query('SELECT id FROM routes WHERE is_active = TRUE');
  const [shifts] = await db.query('SELECT id, name FROM shifts');

  // Seed for the whole month of April 2026
  for (let day = 1; day <= 30; day++) {
    const dateStr = `2026-04-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateStr + 'T12:00:00Z'); // Use noon to avoid day shifts
    const dayOfWeek = dateObj.getUTCDay(); // 0: Sunday, 6: Saturday

    if (dayOfWeek === 0) continue; // Sunday: No services

    for (const r of activeRoutes) {
      for (const s of shifts) {
        // "Se elimina el tercer turno del sabado"
        // Turno 3 is ID 3
        if (dayOfWeek === 6 && s.id === 3) continue; 
        
        await db.query('INSERT IGNORE INTO transport_services (route_id, shift_id, date) VALUES (?, ?, ?)', [r.id, s.id, dateStr]);
      }
    }
  }

  console.log('Database cleaned and seeded for April 2026 with business rules.');
  process.exit(0);
}

robustSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
