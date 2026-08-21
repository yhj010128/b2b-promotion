import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AppLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <div>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-brand">TeamBab</span>
          <nav className="app-nav">
            <NavLink to="/" end className="nav-link">
              회식 일정
            </NavLink>
            <NavLink to="/preferences" className="nav-link">
              선호 의견
            </NavLink>
            <NavLink to="/recommendations" className="nav-link">
              추천 결과
            </NavLink>
            <NavLink to="/review" className="nav-link">
              만족도 평가
            </NavLink>
          </nav>
          <button type="button" className="logout-btn" onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
