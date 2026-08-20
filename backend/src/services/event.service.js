const eventsDb = require('../db/events.db');

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

module.exports = { createEvent, getEventById, closeEvent, EventError };
