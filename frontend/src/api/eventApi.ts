import { request } from './httpClient';

export type EventRecord = {
  id: number;
  event_date: string;
  budget_per_person: number | null;
  headcount: number;
  status: '모집중' | '확정' | '종료';
  confirmed_restaurant_id: number | null;
};

async function toResult(res: Response, defaultMessage: string): Promise<EventRecord> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? defaultMessage);
  }
  return res.json();
}

export async function createEvent(data: {
  event_date: string;
  budget_per_person?: number;
  headcount: number;
}): Promise<EventRecord> {
  const res = await request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return toResult(res, '회식 일정 등록에 실패했습니다');
}

export async function getEvent(id: number | string): Promise<EventRecord> {
  const res = await request(`/api/events/${id}`);
  return toResult(res, '회식 일정 조회에 실패했습니다');
}
