const eventService = require('../services/event.service');
const restaurantsDb = require('../db/restaurants.db');

class RecommendError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function getRecommendations(eventId) {
  const event = await eventService.getEventById(eventId);
  if (event.budget_per_person == null) {
    throw new RecommendError('예산을 먼저 입력하세요', 400);
  }

  const candidates = await restaurantsDb.findByMaxCost(event.budget_per_person);
  if (candidates.length === 0) {
    return { event_id: Number(eventId), recommendations: [], message: '조건에 맞는 추천 결과가 없습니다' };
  }

  const recentLimit = Number(process.env.RECOMMEND_RECENT_VISIT_COUNT);
  const recentIds = new Set(await restaurantsDb.findRecentVisitedRestaurantIds(recentLimit));
  const minScore = Number(process.env.RECOMMEND_MIN_SCORE);

  const recommendations = candidates.map((candidate) => {
    const score = candidate.avg_satisfaction_score != null ? Number(candidate.avg_satisfaction_score) * 20 : 50;
    const lowestPriority =
      (candidate.avg_satisfaction_score != null && Number(candidate.avg_satisfaction_score) < minScore) ||
      recentIds.has(candidate.id);
    return {
      restaurant_id: candidate.id,
      name: candidate.name,
      cost_per_person: candidate.cost_per_person,
      avg_satisfaction_score: candidate.avg_satisfaction_score,
      last_visited_at: candidate.last_visited_at,
      score,
      lowest_priority: lowestPriority,
    };
  });

  recommendations.sort((a, b) => (a.lowest_priority - b.lowest_priority) || (b.score - a.score));

  return { event_id: Number(eventId), recommendations, message: null };
}

module.exports = { getRecommendations, RecommendError };
