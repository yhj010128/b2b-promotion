const { Pool } = require('pg');

function resolveConnectionString() {
  const connectionString = process.env.DATABASE_URL || process.env.DB_CONN_STRING;
  if (!connectionString) {
    throw new Error('DATABASE_URL 또는 DB_CONN_STRING 환경변수가 필요합니다');
  }
  return connectionString;
}

const pool = new Pool({ connectionString: resolveConnectionString() });

module.exports.pool = pool;
module.exports.resolveConnectionString = resolveConnectionString;
