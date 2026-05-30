const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  // Use stderr directly — logger requires DB which creates a circular dependency here
  process.stderr.write(`[DB pool error] ${err.message}\n`);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
