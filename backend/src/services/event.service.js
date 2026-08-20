const eventsDb = require('../db/events.db');
const restaurantsDb = require('../db/restaurants.db');

class EventError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function createEvent({ event_date, budget_per_person, headcount }) {
  if (!event_date || !headcount) {
    throw new EventError('날짜와 인원은 필수입니다', 400);
  }
  return eventsDb.insertEvent(event_date, budget_per_person, headcount);
}

async function getEventById(id) {
  const event = await eventsDb.findById(id);
  if (!event) {
    throw new EventError('존재하지 않는 일정입니다', 404);
  }
  return event;
}

async function closeEvent(id) {
  const event = await eventsDb.findById(id);
  if (!event) {
    throw new EventError('존재하지 않는 일정입니다', 404);
  }
  if (event.status !== '확정') {
    throw new EventError('확정 상태에서만 종료할 수 있습니다', 409);
  }
  return eventsDb.updateStatus(id, '종료');
}

async function confirmEvent(id, restaurantId) {
  if (!restaurantId) {
    throw new EventError('restaurant_id는 필수입니다', 400);
  }

  const event = await eventsDb.findById(id);
  if (!event) {
    throw new EventError('존재하지 않는 일정입니다', 404);
  }
  if (event.status !== '모집중') {
    throw new EventError('모집중 상태에서만 확정할 수 있습니다', 409);
  }

  const restaurant = await restaurantsDb.findById(restaurantId);
  if (!restaurant) {
    throw new EventError('존재하지 않는 식당입니다', 404);
  }

  const confirmed = await eventsDb.confirmRestaurant(id, restaurantId);
  await restaurantsDb.updateLastVisitedAt(restaurantId, confirmed.event_date);
  return confirmed;
}

module.exports = { createEvent, getEventById, closeEvent, confirmEvent, EventError };
