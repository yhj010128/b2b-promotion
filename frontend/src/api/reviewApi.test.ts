import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitReview } from './reviewApi';
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

describe('reviewApi', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('submitReview: POST /api/events/{id}/reviews 로 body를 그대로 전달하고 응답 JSON을 반환한다', async () => {
    const created = {
      id: 1,
      event_id: 1,
      user_id: 10,
      restaurant_id: 5,
      rating: 4,
      comment: '좋았어요',
    };
    requestMock.mockResolvedValueOnce(jsonResponse(201, created));

    const result = await submitReview(1, { rating: 4, comment: '좋았어요' });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events/1/reviews');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options?.body as string)).toEqual({
      rating: 4,
      comment: '좋았어요',
    });
    expect(result).toEqual(created);
  });

  it('submitReview: comment 없이도 정상 동작한다', async () => {
    const created = {
      id: 2,
      event_id: 1,
      user_id: 10,
      restaurant_id: 5,
      rating: 5,
      comment: null,
    };
    requestMock.mockResolvedValueOnce(jsonResponse(201, created));

    const result = await submitReview(1, { rating: 5 });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events/1/reviews');
    expect(JSON.parse(options?.body as string)).toEqual({ rating: 5 });
    expect(result).toEqual(created);
  });

  it('실패 응답이면 message로 Error를 throw한다 (C4: 회식 종료 전 평가 시도)', async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse(400, { message: '회식 종료 후 평가 가능' }),
    );

    await expect(submitReview(1, { rating: 3 })).rejects.toThrow(
      '회식 종료 후 평가 가능',
    );
  });
});
