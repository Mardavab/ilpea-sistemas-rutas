const mysql = require('mysql2/promise');

let pool;
const baseConfig = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

if (process.env.DATABASE_URL) {
  // Si hay DATABASE_URL, la usamos como base y mezclamos con la configuración base (SSL/Timeouts)
  pool = mysql.createPool(`${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes('?') ? '&' : '?'}connectTimeout=20000`);
  // Nota: mysql2 permite configurar SSL mediante el objeto de opciones incluso con una URI, 
  // pero para máxima compatibilidad con el pool de promesas, reconstruimos el objeto si es necesario.
  // Re-creamos el pool con el objeto extendido para asegurar que SSL se aplique.
  pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ...baseConfig
  });
} else {
  pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'ilpea_user',
    password: process.env.DB_PASSWORD || 'ilpea_pass',
    database: process.env.DB_NAME     || 'ilpea_db',
    ...baseConfig
  });
}

module.exports = pool;
