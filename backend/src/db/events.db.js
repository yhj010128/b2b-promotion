const { pool } = require('./pool');

async function insertEvent(eventDate, budgetPerPerson, headcount) {
  const result = await pool.query(
    'INSERT INTO events (event_date, budget_per_person, headcount) VALUES ($1, $2, $3) RETURNING *',
    [eventDate, budgetPerPerson === undefined ? null : budgetPerPerson, headcount]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateStatus(id, newStatus) {
  const result = await pool.query('UPDATE events SET status = $2 WHERE id = $1 RETURNING *', [id, newStatus]);
  return result.rows[0];
}

async function confirmRestaurant(id, restaurantId) {
  const result = await pool.query(
    "UPDATE events SET confirmed_restaurant_id = $2, status = '확정' WHERE id = $1 RETURNING *",
    [id, restaurantId]
  );
  return result.rows[0];
}

module.exports = { insertEvent, findById, updateStatus, confirmRestaurant };
