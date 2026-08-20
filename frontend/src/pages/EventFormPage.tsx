import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { createEvent, getEvent, EventRecord } from '../api/eventApi';

export function EventFormPage() {
  const { role } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventDate, setEventDate] = useState('');
  const [budgetPerPerson, setBudgetPerPerson] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const currentEventId = localStorage.getItem('currentEventId');
    if (!currentEventId) {
      setLoading(false);
      return;
    }
    getEvent(currentEventId)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : '회식 일정 조회에 실패했습니다'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const created = await createEvent({
        event_date: eventDate,
        ...(budgetPerPerson ? { budget_per_person: Number(budgetPerPerson) } : {}),
        headcount: Number(headcount),
      });
      localStorage.setItem('currentEventId', String(created.id));
      setEvent(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회식 일정 등록에 실패했습니다');
    }
  }

  if (loading) {
    return <div className="form-container">불러오는 중...</div>;
  }

  if (event) {
    return (
      <div className="form-container">
        <h1>회식 일정</h1>
        <div>
          <label>날짜</label>
          <p>{event.event_date}</p>
        </div>
        <div>
          <label>1인당 예산</label>
          <p>{event.budget_per_person != null ? `${event.budget_per_person}원` : '미입력'}</p>
        </div>
        <div>
          <label>인원</label>
          <p>{event.headcount}명</p>
        </div>
        <div>
          <label>상태</label>
          <p>{event.status}</p>
        </div>
      </div>
    );
  }

  if (role !== '팀장') {
    return (
      <div className="form-container">
        <h1>회식 일정</h1>
        <p>아직 등록된 회식 일정이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h1>회식 일정 등록</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="event_date">날짜</label>
          <input
            id="event_date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="budget_per_person">1인당 예산</label>
          <input
            id="budget_per_person"
            type="number"
            value={budgetPerPerson}
            onChange={(e) => setBudgetPerPerson(e.target.value)}
          />
          <p>예산을 입력하지 않으면 추천 시 오류가 발생합니다</p>
        </div>
        <div>
          <label htmlFor="headcount">인원</label>
          <input
            id="headcount"
            type="number"
            value={headcount}
            onChange={(e) => setHeadcount(e.target.value)}
            required
          />
        </div>
        <div>
          <label>상태</label>
          <p>모집중</p>
        </div>
        <button type="submit">등록/저장</button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}
