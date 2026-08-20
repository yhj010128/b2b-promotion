const { Pool, types } = require('pg');

// DATE 컬럼을 Date 객체로 변환하면 로컬 타임존 영향으로 날짜가 어긋난다.
// 원본 문자열('YYYY-MM-DD')을 그대로 사용한다.
types.setTypeParser(types.builtins.DATE, (value) => value);

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
