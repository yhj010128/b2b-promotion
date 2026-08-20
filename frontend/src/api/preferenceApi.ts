import { request } from './httpClient';

export type PreferenceRecord = {
  id: number;
  event_id: number;
  user_id: number;
  wanted_menu: string | null;
  disliked_food: string | null;
};

export async function submitPreference(
  eventId: number | string,
  data: { wanted_menu?: string; disliked_food?: string },
): Promise<PreferenceRecord> {
  const res = await request(`/api/events/${eventId}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? '선호 의견 제출에 실패했습니다');
  }
  return res.json();
}
