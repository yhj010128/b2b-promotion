const { pool } = require('./pool');

async function findByLoginId(loginId) {
  const result = await pool.query('SELECT * FROM users WHERE login_id = $1', [loginId]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateRefreshTokenHash(userId, refreshTokenHash) {
  await pool.query('UPDATE users SET refresh_token_hash = $1 WHERE id = $2', [refreshTokenHash, userId]);
}

module.exports = { findByLoginId, findById, updateRefreshTokenHash };
