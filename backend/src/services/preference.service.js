const preferencesDb = require('../db/preferences.db');
const eventService = require('./event.service');

class PreferenceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function submitPreference(eventId, userId, { wanted_menu, disliked_food }) {
  await eventService.getEventById(eventId); // 존재하지 않으면 EventError(404)를 그대로 전파

  const existing = await preferencesDb.findByEventAndUser(eventId, userId);
  if (existing) {
    return preferencesDb.update(existing.id, wanted_menu ?? null, disliked_food ?? null);
  }
  return preferencesDb.insert(eventId, userId, wanted_menu ?? null, disliked_food ?? null);
}

module.exports = { submitPreference, PreferenceError };
