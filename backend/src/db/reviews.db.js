const { pool } = require('./pool');

async function insert(eventId, userId, restaurantId, rating, comment) {
  const result = await pool.query(
    'INSERT INTO reviews (event_id, user_id, restaurant_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [eventId, userId, restaurantId, rating, comment ?? null]
  );
  return result.rows[0];
}

module.exports = { insert };
