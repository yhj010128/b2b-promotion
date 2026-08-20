import { useState, useCallback } from 'react';
import * as authApi from '../api/authApi';

type Role = '팀장' | '팀원' | null;

function decodeRole(token: string): Role {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const json = JSON.parse(new TextDecoder('utf-8').decode(bytes));
    return json.role ?? null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
  const [role, setRole] = useState<Role>(() => {
    const token = localStorage.getItem('accessToken');
    return token ? decodeRole(token) : null;
  });

  const login = useCallback(async (loginId: string, password: string) => {
    const { accessToken, refreshToken } = await authApi.login(loginId, password);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setIsAuthenticated(true);
    setRole(decodeRole(accessToken));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setRole(null);
  }, []);

  return { isAuthenticated, role, login, logout };
}
