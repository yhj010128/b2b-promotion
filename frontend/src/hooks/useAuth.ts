import { useState, useCallback } from 'react';
import * as authApi from '../api/authApi';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));

  const login = useCallback(async (loginId: string, password: string) => {
    const { accessToken, refreshToken } = await authApi.login(loginId, password);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
