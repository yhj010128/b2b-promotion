import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecommendations, confirmRestaurant } from './recommendationApi';
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

describe('recommendationApi', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('getRecommendations: GET /api/events/{id}/recommendations 로 호출하고 응답 JSON을 반환한다', async () => {
    const response = {
      event_id: 1,
      recommendations: [
        {
          restaurant_id: 10,
          name: '맛집A',
          cost_per_person: 20000,
          avg_satisfaction_score: 4.5,
          last_visited_at: '2026-01-01',
          score: 0.9,
          lowest_priority: false,
        },
        {
          restaurant_id: 11,
          name: '맛집B',
          cost_per_person: 25000,
          avg_satisfaction_score: null,
          last_visited_at: null,
          score: 0.7,
          lowest_priority: true,
        },
      ],
      message: null,
    };
    requestMock.mockResolvedValueOnce(jsonResponse(200, response));

    const result = await getRecommendations(1);

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events/1/recommendations');
    expect(options?.method ?? 'GET').toBe('GET');
    expect(result).toEqual(response);
  });

  it('getRecommendations: C6(후보 0건) - message가 채워진 200 응답을 에러 없이 그대로 반환한다', async () => {
    const response = {
      event_id: 2,
      recommendations: [],
      message: '조건에 맞는 추천 결과가 없습니다',
    };
    requestMock.mockResolvedValueOnce(jsonResponse(200, response));

    const result = await getRecommendations(2);

    expect(result).toEqual(response);
    expect(result.recommendations).toEqual([]);
  });

  it('getRecommendations: C3(예산 미입력 등) - 400 응답이면 message로 Error를 throw한다', async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse(400, { message: '예산을 먼저 입력하세요' }),
    );

    await expect(getRecommendations(3)).rejects.toThrow('예산을 먼저 입력하세요');
  });

  it('confirmRestaurant: POST /api/events/{id}/confirm 로 restaurant_id를 전달하고 응답 JSON을 반환한다', async () => {
    const confirmed = {
      id: 1,
      event_date: '2026-10-01',
      budget_per_person: 25000,
      headcount: 4,
      status: '확정',
      confirmed_restaurant_id: 5,
    };
    requestMock.mockResolvedValueOnce(jsonResponse(200, confirmed));

    const result = await confirmRestaurant(1, 5);

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events/1/confirm');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options?.body as string)).toEqual({ restaurant_id: 5 });
    expect(result).toEqual(confirmed);
  });

  it('confirmRestaurant: 실패 응답(예: 409)이면 message로 Error를 throw한다', async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse(409, { message: '모집중 상태에서만 확정할 수 있습니다' }),
    );

    await expect(confirmRestaurant(1, 5)).rejects.toThrow(
      '모집중 상태에서만 확정할 수 있습니다',
    );
  });
});
