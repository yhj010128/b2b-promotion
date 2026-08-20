const eventsDb = require('../db/events.db');
const reviewsDb = require('../db/reviews.db');
const restaurantsDb = require('../db/restaurants.db');

class ReviewError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function submitReview(eventId, userId, { rating, comment }) {
  const event = await eventsDb.findById(eventId);
  if (!event) {
    throw new ReviewError('존재하지 않는 일정입니다', 404);
  }
  if (event.status !== '종료') {
    throw new ReviewError('회식 종료 후 평가 가능', 400);
  }
  if (rating == null || rating < 1 || rating > 5) {
    throw new ReviewError('별점은 1~5 사이여야 합니다', 400);
  }

  const review = await reviewsDb.insert(eventId, userId, event.confirmed_restaurant_id, rating, comment);
  await restaurantsDb.recalculateAvgSatisfactionScore(event.confirmed_restaurant_id);
  return review;
}

module.exports = { submitReview, ReviewError };
