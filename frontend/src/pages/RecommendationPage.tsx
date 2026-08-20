import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RestaurantCard } from '../components/RestaurantCard';
import {
  getRecommendations,
  confirmRestaurant,
  Recommendation,
  EventRecord,
} from '../api/recommendationApi';

export function RecommendationPage() {
  const { role } = useAuth();
  const eventId = localStorage.getItem('currentEventId');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [manualRestaurantId, setManualRestaurantId] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<EventRecord | null>(null);
  const [confirmedName, setConfirmedName] = useState('');

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    getRecommendations(eventId)
      .then((res) => {
        setRecommendations(res.recommendations);
        setMessage(res.message);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : '추천 결과 조회에 실패했습니다'))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function handleConfirm(restaurantId: number) {
    if (!eventId) return;
    setConfirmError('');
    setConfirming(true);
    try {
      const event = await confirmRestaurant(eventId, restaurantId);
      const matched = recommendations.find((rec) => rec.restaurant_id === restaurantId);
      setConfirmedName(matched?.name ?? '선택한');
      setConfirmed(event);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : '식당 확정에 실패했습니다');
    } finally {
      setConfirming(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(manualRestaurantId);
    if (!id) return;
    handleConfirm(id);
  }

  if (!eventId) {
    return (
      <div className="form-container">
        <h1>추천 결과</h1>
        <p>먼저 회식 일정을 등록/확인해주세요</p>
        <Link to="/">회식 일정으로 이동</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="form-container">불러오는 중...</div>;
  }

  if (confirmed) {
    return (
      <div className="form-container">
        <h1>추천 결과</h1>
        <p className="success-message">
          {confirmedName} 식당으로 확정되었습니다. 상태: {confirmed.status}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="form-container">
        <h1>추천 결과</h1>
        <p className="error-message">{loadError}</p>
        {role === '팀장' && <Link to="/">회식 일정에서 예산을 확인하세요</Link>}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="form-container">
        <h1>추천 결과</h1>
        <p>{message}</p>
        {role === '팀장' && (
          <form onSubmit={handleManualSubmit}>
            <label htmlFor="manual_restaurant_id">식당 ID로 수동 확정</label>
            <input
              id="manual_restaurant_id"
              type="number"
              value={manualRestaurantId}
              onChange={(e) => setManualRestaurantId(e.target.value)}
              required
            />
            <button type="submit" disabled={confirming}>
              확정
            </button>
          </form>
        )}
        {confirmError && <p className="error-message">{confirmError}</p>}
      </div>
    );
  }

  return (
    <div className="form-container">
      <h1>추천 결과</h1>
      <div className="restaurant-card-list">
        {recommendations.map((rec) => (
          <RestaurantCard
            key={rec.restaurant_id}
            recommendation={rec}
            showConfirmButton={role === '팀장'}
            confirming={confirming}
            onConfirm={() => handleConfirm(rec.restaurant_id)}
          />
        ))}
      </div>
      {confirmError && <p className="error-message">{confirmError}</p>}
    </div>
  );
}
