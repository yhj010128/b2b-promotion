import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitPreference } from '../api/preferenceApi';

export function PreferenceFormPage() {
  const eventId = localStorage.getItem('currentEventId');
  const [wantedMenu, setWantedMenu] = useState('');
  const [dislikedFood, setDislikedFood] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!eventId) {
    return (
      <div className="form-container">
        <h1>선호 의견 제출</h1>
        <p>먼저 회식 일정을 등록/확인해주세요</p>
        <Link to="/">회식 일정으로 이동</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitted(false);
    try {
      await submitPreference(eventId as string, {
        ...(wantedMenu ? { wanted_menu: wantedMenu } : {}),
        ...(dislikedFood ? { disliked_food: dislikedFood } : {}),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '선호 의견 제출에 실패했습니다');
    }
  }

  return (
    <div className="form-container">
      <h1>선호 의견 제출</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="wanted_menu">희망 메뉴/식당</label>
          <input
            id="wanted_menu"
            type="text"
            value={wantedMenu}
            onChange={(e) => setWantedMenu(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="disliked_food">못 먹는 음식</label>
          <input
            id="disliked_food"
            type="text"
            value={dislikedFood}
            onChange={(e) => setDislikedFood(e.target.value)}
          />
        </div>
        <button type="submit">제출</button>
        {error && <p className="error-message">{error}</p>}
        {submitted && <p className="success-message">제출되었습니다</p>}
      </form>
    </div>
  );
}
