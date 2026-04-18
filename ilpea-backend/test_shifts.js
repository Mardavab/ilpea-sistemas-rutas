const db = require('./src/config/db');

async function test() {
  console.log('--- Testing Shifts Endpoint ---');
  const [rows] = await db.query('SELECT id, name FROM shifts ORDER BY id');
  console.log('Shifts in DB:', rows);
  
  if (rows.length === 3 && rows[0].name === 'Turno 1') {
    console.log('SUCCESS: Backend is returning the correct shifts.');
  } else {
    console.log('WARNING: Shades results are different than expected.', rows);
  }
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
