import type { Recommendation } from '../api/recommendationApi';

export function RestaurantCard({
  recommendation,
  showConfirmButton,
  onConfirm,
  confirming,
}: {
  recommendation: Recommendation;
  showConfirmButton: boolean;
  onConfirm?: () => void;
  confirming?: boolean;
}) {
  const { name, cost_per_person, avg_satisfaction_score, lowest_priority } = recommendation;

  return (
    <div className="restaurant-card">
      <h3>
        {name}
        {lowest_priority && <span> (낮은 우선순위)</span>}
      </h3>
      <p>1인 예상 비용: {cost_per_person}원</p>
      <p>
        누적 평균 만족도:{' '}
        {avg_satisfaction_score != null ? `★ ${Number(avg_satisfaction_score).toFixed(1)}` : '평가 없음'}
      </p>
      {showConfirmButton && (
        <button type="button" onClick={onConfirm} disabled={confirming}>
          확정
        </button>
      )}
    </div>
  );
}
