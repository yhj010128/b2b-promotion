import { describe, it, expect, beforeEach, vi } from 'vitest';
import { request } from './httpClient';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe('httpClient.request', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { location: { href: '' } });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('정상 요청: accessToken이 있으면 Authorization 헤더를 붙여 1번만 호출한다', async () => {
    localStorageMock.setItem('accessToken', 'access-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const res = await request('/api/events');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(res.status).toBe(200);
  });

  it('401 -> 재발급 성공 -> 재시도 성공', async () => {
    localStorageMock.setItem('accessToken', 'access-old');
    localStorageMock.setItem('refreshToken', 'refresh-old');

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const res = await request('/api/events');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorageMock.getItem('accessToken')).toBe('new-access');
    expect(localStorageMock.getItem('refreshToken')).toBe('new-refresh');
    expect(res.status).toBe(200);

    const [, retryInit] = fetchMock.mock.calls[2];
    const retryHeaders = new Headers(retryInit?.headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-access');
  });

  it('401 -> 재발급도 실패 -> 로그아웃 처리(토큰 제거 + /login 이동)', async () => {
    localStorageMock.setItem('accessToken', 'access-old');
    localStorageMock.setItem('refreshToken', 'refresh-old');

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}));

    const res = await request('/api/events');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorageMock.getItem('accessToken')).toBeNull();
    expect(localStorageMock.getItem('refreshToken')).toBeNull();
    expect((globalThis as unknown as { window: { location: { href: string } } }).window.location.href).toBe(
      '/login',
    );
    expect(res.status).toBe(401);
  });

  it('재시도 후 다시 401이어도 refresh를 두 번째로 호출하지 않는다', async () => {
    localStorageMock.setItem('accessToken', 'access-old');
    localStorageMock.setItem('refreshToken', 'refresh-old');

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
      )
      .mockResolvedValueOnce(jsonResponse(401, {}));

    const res = await request('/api/events');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(401);
  });
});
