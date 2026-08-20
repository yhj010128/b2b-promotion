'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/app');
const { pool } = require('../src/db/pool');

let server;
let baseUrl;

let leaderToken;

const createdEventIds = [];
const createdRestaurantIds = [];

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const leaderRes = await login('leader01', 'password123');
  leaderToken = (await leaderRes.json()).accessToken;
});

after(async () => {
  if (createdEventIds.length > 0) {
    await pool.query('DELETE FROM reviews WHERE event_id = ANY($1)', [createdEventIds]);
    await pool.query('DELETE FROM events WHERE id = ANY($1)', [createdEventIds]);
  }
  if (createdRestaurantIds.length > 0) {
    await pool.query('DELETE FROM reviews WHERE restaurant_id = ANY($1)', [createdRestaurantIds]);
    await pool.query('DELETE FROM restaurants WHERE id = ANY($1)', [createdRestaurantIds]);
  }
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function login(login_id, password) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id, password }),
  });
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function insertRestaurant(name, costPerPerson, avgScore) {
  const result = await pool.query(
    'INSERT INTO restaurants (name, cost_per_person, avg_satisfaction_score) VALUES ($1, $2, $3) RETURNING id',
    [name, costPerPerson, avgScore]
  );
  createdRestaurantIds.push(result.rows[0].id);
  return result.rows[0].id;
}

async function createEvent(body) {
  const res = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: authHeaders(leaderToken),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  createdEventIds.push(data.id);
  return data;
}

async function confirmEvent(id, restaurantId) {
  return fetch(`${baseUrl}/api/events/${id}/confirm`, {
    method: 'POST',
    headers: authHeaders(leaderToken),
    body: JSON.stringify({ restaurant_id: restaurantId }),
  });
}

async function closeEvent(id) {
  return fetch(`${baseUrl}/api/events/${id}/close`, {
    method: 'POST',
    headers: authHeaders(leaderToken),
  });
}

async function submitReview(token, id, body) {
  return fetch(`${baseUrl}/api/events/${id}/reviews`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

async function createClosedEvent(restaurantId, eventDate) {
  const event = await createEvent({ event_date: eventDate, budget_per_person: 25000, headcount: 4 });
  await confirmEvent(event.id, restaurantId);
  const closeRes = await closeEvent(event.id);
  assert.equal(closeRes.status, 200);
  return event.id;
}

test('종료 상태 회식에 평가 저장 -> 201, restaurant_id는 확정식당id와 일치', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_review1_${Date.now()}`, 20000, null);
  const eventId = await createClosedEvent(restaurantId, '2026-10-01');

  const res = await submitReview(leaderToken, eventId, { rating: 5, comment: '좋았어요' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.event_id, eventId);
  assert.equal(body.restaurant_id, restaurantId);
  assert.equal(body.rating, 5);
  assert.equal(body.comment, '좋았어요');
});

test('C4: 종료 전(모집중) 회식에 평가 시도 -> 400, 지정 문구 반환', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_review_c4_1_${Date.now()}`, 20000, null);
  const event = await createEvent({ event_date: '2026-10-02', budget_per_person: 25000, headcount: 4 });

  const res = await submitReview(leaderToken, event.id, { rating: 4 });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, '회식 종료 후 평가 가능');

  // 확정만 되고 아직 종료 전인 경우도 동일하게 거부
  await confirmEvent(event.id, restaurantId);
  const res2 = await submitReview(leaderToken, event.id, { rating: 4 });
  assert.equal(res2.status, 400);
  assert.equal((await res2.json()).message, '회식 종료 후 평가 가능');
});

test('별점이 범위(1~5)를 벗어나면 400', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_review_range_${Date.now()}`, 20000, null);
  const eventId = await createClosedEvent(restaurantId, '2026-10-03');

  const res = await submitReview(leaderToken, eventId, { rating: 6 });
  assert.equal(res.status, 400);
});

test('평가 저장 후 식당의 누적 평균 만족도가 재계산되어 갱신됨', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_review_avg_${Date.now()}`, 20000, null);

  const event1 = await createClosedEvent(restaurantId, '2026-10-04');
  await submitReview(leaderToken, event1, { rating: 4 });

  const event2 = await createClosedEvent(restaurantId, '2026-10-05');
  const res = await submitReview(leaderToken, event2, { rating: 2 });
  assert.equal(res.status, 201);

  const { rows } = await pool.query('SELECT avg_satisfaction_score FROM restaurants WHERE id = $1', [restaurantId]);
  assert.equal(Number(rows[0].avg_satisfaction_score), 3);
});

test('갱신된 만족도 점수가 다음 추천의 C5 판정에 반영됨', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_review_c5_${Date.now()}`, 20000, 4.5);
  const eventId = await createClosedEvent(restaurantId, '2026-10-06');

  // 저평점 리뷰로 평균을 2.5 미만으로 떨어뜨림
  await submitReview(leaderToken, eventId, { rating: 1 });

  const nextEvent = await createEvent({ event_date: '2026-10-07', budget_per_person: 25000, headcount: 4 });
  const recRes = await fetch(`${baseUrl}/api/events/${nextEvent.id}/recommendations`, {
    headers: authHeaders(leaderToken),
  });
  const recBody = await recRes.json();
  const candidate = recBody.recommendations.find((r) => r.restaurant_id === restaurantId);
  assert.ok(candidate);
  assert.equal(candidate.lowest_priority, true);
});

test('미인증 요청은 401', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_review_401_${Date.now()}`, 20000, null);
  const eventId = await createClosedEvent(restaurantId, '2026-10-08');

  const res = await fetch(`${baseUrl}/api/events/${eventId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: 5 }),
  });
  assert.equal(res.status, 401);
});

test('존재하지 않는 이벤트에 평가 시도 -> 404', async () => {
  const res = await submitReview(leaderToken, 999999999, { rating: 5 });
  assert.equal(res.status, 404);
});
