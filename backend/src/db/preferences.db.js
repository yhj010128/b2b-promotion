const { pool } = require('./pool');

async function findByEventAndUser(eventId, userId) {
  const result = await pool.query(
    'SELECT * FROM preferences WHERE event_id = $1 AND user_id = $2',
    [eventId, userId]
  );
  return result.rows[0] || null;
}

async function insert(eventId, userId, wantedMenu, dislikedFood) {
  const result = await pool.query(
    'INSERT INTO preferences (event_id, user_id, wanted_menu, disliked_food) VALUES ($1, $2, $3, $4) RETURNING *',
    [eventId, userId, wantedMenu, dislikedFood]
  );
  return result.rows[0];
}

async function update(id, wantedMenu, dislikedFood) {
  const result = await pool.query(
    'UPDATE preferences SET wanted_menu = $2, disliked_food = $3 WHERE id = $1 RETURNING *',
    [id, wantedMenu, dislikedFood]
  );
  return result.rows[0];
}

module.exports = { findByEventAndUser, insert, update };
