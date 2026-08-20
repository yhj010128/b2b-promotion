const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function withAuthHeaders(options?: RequestInit): RequestInit {
  const headers = new Headers(options?.headers);
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return { ...options, headers };
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;

  const { accessToken, refreshToken: newRefreshToken } = await res.json();
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);
  return true;
}

export async function request(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, withAuthHeaders(options));
  if (res.status !== 401) return res;

  const refreshed = await refreshTokens();
  if (!refreshed) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return res;
  }

  return fetch(`${BASE_URL}${path}`, withAuthHeaders(options));
}
