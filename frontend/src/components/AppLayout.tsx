import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AppLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <div>
      <nav>
        <Link to="/">회식 일정</Link> | <Link to="/preferences">선호 의견</Link> |{' '}
        <Link to="/recommendations">추천 결과</Link> | <Link to="/review">만족도 평가</Link> |{' '}
        <button type="button" onClick={logout}>
          로그아웃
        </button>
      </nav>
      {children}
    </div>
  );
}
