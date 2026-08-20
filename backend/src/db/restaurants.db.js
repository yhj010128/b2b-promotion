const { pool } = require('./pool');

async function findByMaxCost(maxCost) {
  const result = await pool.query('SELECT * FROM restaurants WHERE cost_per_person <= $1', [maxCost]);
  return result.rows;
}

async function findRecentVisitedRestaurantIds(limit) {
  const result = await pool.query(
    `SELECT confirmed_restaurant_id FROM events
     WHERE status = '종료' AND confirmed_restaurant_id IS NOT NULL
     ORDER BY event_date DESC, id DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((row) => row.confirmed_restaurant_id);
}

module.exports = { findByMaxCost, findRecentVisitedRestaurantIds };
