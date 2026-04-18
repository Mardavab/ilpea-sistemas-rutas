const mysql = require('mysql2/promise');

const poolConfig = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL 
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '3306'),
      user:     process.env.DB_USER     || 'ilpea_user',
      password: process.env.DB_PASSWORD || 'ilpea_pass',
      database: process.env.DB_NAME     || 'ilpea_db',
      ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

const pool = mysql.createPool({
  ...((typeof poolConfig === 'string') ? {} : poolConfig),
  uri: (typeof poolConfig === 'string') ? poolConfig : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000, // 20 segundos para evitar timeouts en conexiones lentas entre clouds
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

module.exports = pool;
