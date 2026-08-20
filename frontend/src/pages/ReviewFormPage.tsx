import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvent, EventRecord } from '../api/eventApi';
import { submitReview } from '../api/reviewApi';
import { StarRating } from '../components/StarRating';

export function ReviewFormPage() {
  const eventId = localStorage.getItem('currentEventId');
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : '회식 일정 조회에 실패했습니다'));
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="form-container">
        <h1>만족도 평가</h1>
        <p>먼저 회식 일정을 등록/확인해주세요</p>
        <Link to="/">회식 일정으로 이동</Link>
      </div>
    );
  }

  const notClosed = event?.status !== '종료';
  const disabled = notClosed || rating === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitted(false);
    try {
      await submitReview(eventId as string, {
        rating,
        ...(comment ? { comment } : {}),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '만족도 평가 제출에 실패했습니다');
    }
  }

  return (
    <div className="form-container">
      <h1>만족도 평가</h1>
      {notClosed && <p>회식 종료 후 평가 가능</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>별점</label>
          <StarRating value={rating} onChange={setRating} disabled={notClosed} />
        </div>
        <div>
          <label htmlFor="comment">한줄평</label>
          <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <button type="submit" disabled={disabled}>
          제출
        </button>
        {notClosed && <p>회식 종료 후 평가 가능</p>}
        {error && <p className="error-message">{error}</p>}
        {submitted && <p className="success-message">제출되었습니다</p>}
      </form>
    </div>
  );
}
