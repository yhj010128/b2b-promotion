import { request } from './httpClient';

export type Review = {
  id: number;
  event_id: number;
  user_id: number;
  restaurant_id: number;
  rating: number;
  comment: string | null;
};

export async function submitReview(
  eventId: number | string,
  data: { rating: number; comment?: string },
): Promise<Review> {
  const res = await request(`/api/events/${eventId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? '만족도 평가 제출에 실패했습니다');
  }
  return res.json();
}
