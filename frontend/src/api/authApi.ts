const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type TokenPair = { accessToken: string; refreshToken: string };

export async function login(loginId: string, password: string): Promise<TokenPair> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? '로그인에 실패했습니다');
  }
  return res.json();
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? '재발급에 실패했습니다');
  }
  return res.json();
}
