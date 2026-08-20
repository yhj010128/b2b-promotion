import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitPreference } from './preferenceApi';
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

describe('preferenceApi', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('submitPreference: POST /api/events/{id}/preferences 로 body를 그대로 전달하고 응답 JSON을 반환한다', async () => {
    const created = {
      id: 1,
      event_id: 1,
      user_id: 10,
      wanted_menu: '삼겹살',
      disliked_food: '회',
    };
    requestMock.mockResolvedValueOnce(jsonResponse(201, created));

    const result = await submitPreference(1, {
      wanted_menu: '삼겹살',
      disliked_food: '회',
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events/1/preferences');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options?.body as string)).toEqual({
      wanted_menu: '삼겹살',
      disliked_food: '회',
    });
    expect(result).toEqual(created);
  });

  it('submitPreference: 필드를 하나도 안 넣어도 정상 동작한다', async () => {
    const created = {
      id: 2,
      event_id: 1,
      user_id: 10,
      wanted_menu: null,
      disliked_food: null,
    };
    requestMock.mockResolvedValueOnce(jsonResponse(201, created));

    const result = await submitPreference(1, {});

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/api/events/1/preferences');
    expect(JSON.parse(options?.body as string)).toEqual({});
    expect(result).toEqual(created);
  });

  it('실패 응답이면 message로 Error를 throw한다', async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse(404, { message: '존재하지 않는 일정입니다' }),
    );

    await expect(
      submitPreference(1, { wanted_menu: '삼겹살' }),
    ).rejects.toThrow('존재하지 않는 일정입니다');
  });
});
