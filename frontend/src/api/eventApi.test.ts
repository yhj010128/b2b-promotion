import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent, getEvent } from './eventApi';
import { request } from './httpClient';

vi.mock('./httpClient', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe('eventApi', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('createEvent: POST /api/events 로 body를 그대로 전달하고 응답 JSON을 반환한다', async () => {
    const created = {
      id: 1,
      event_date: '2026-10-01',
      budget_per_person: 25000,
      headcount: 4,
      status: '모집중',
      confirmed_restaurant_id: null,
    };
    requestMock.mockResolvedValueOnce(jsonResponse(201, created));

    const result = await createEvent({
      event_date: '2026-10-01',
      budget_per_person: 25000,
      headcount: 4,
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options?.body as string)).toEqual({
      event_date: '2026-10-01',
      budget_per_person: 25000,
      headcount: 4,
    });
    expect(result).toEqual(created);
  });

  it('createEvent: budget_per_person 생략해도 정상 동작한다', async () => {
    const created = {
      id: 2,
      event_date: '2026-11-01',
      budget_per_person: null,
      headcount: 6,
      status: '모집중',
      confirmed_restaurant_id: null,
    };
    requestMock.mockResolvedValueOnce(jsonResponse(201, created));

    const result = await createEvent({ event_date: '2026-11-01', headcount: 6 });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [, options] = requestMock.mock.calls[0];
    const body = JSON.parse(options?.body as string);
    expect(body.event_date).toBe('2026-11-01');
    expect(body.headcount).toBe(6);
    expect(body.budget_per_person).toBeUndefined();
    expect(result).toEqual(created);
  });

  it('getEvent: GET /api/events/{id} 로 호출하고 응답 JSON을 반환한다', async () => {
    const event = {
      id: 5,
      event_date: '2026-10-01',
      budget_per_person: 30000,
      headcount: 5,
      status: '확정',
      confirmed_restaurant_id: 3,
    };
    requestMock.mockResolvedValueOnce(jsonResponse(200, event));

    const result = await getEvent(5);

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events/5');
    expect(options?.method ?? 'GET').toBe('GET');
    expect(result).toEqual(event);
  });

  it('실패 응답이면 message로 Error를 throw한다', async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse(400, { message: '날짜와 인원은 필수입니다' }),
    );

    await expect(
      createEvent({ event_date: '', headcount: 0 }),
    ).rejects.toThrow('날짜와 인원은 필수입니다');
  });
});
