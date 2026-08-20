import { request } from './httpClient';

export type Recommendation = {
  restaurant_id: number;
  name: string;
  cost_per_person: number;
  avg_satisfaction_score: number | null;
  last_visited_at: string | null;
  score: number;
  lowest_priority: boolean;
};

export type RecommendationResponse = {
  event_id: number;
  recommendations: Recommendation[];
  message: string | null;
};

export type EventRecord = {
  id: number;
  event_date: string;
  budget_per_person: number | null;
  headcount: number;
  status: '모집중' | '확정' | '종료';
  confirmed_restaurant_id: number | null;
};

export async function getRecommendations(eventId: number | string): Promise<RecommendationResponse> {
  const res = await request(`/api/events/${eventId}/recommendations`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? '추천 결과 조회에 실패했습니다');
  }
  return res.json();
}

export async function confirmRestaurant(
  eventId: number | string,
  restaurantId: number,
): Promise<EventRecord> {
  const res = await request(`/api/events/${eventId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurant_id: restaurantId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? '식당 확정에 실패했습니다');
  }
  return res.json();
}
