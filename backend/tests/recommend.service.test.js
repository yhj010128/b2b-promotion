'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/app');
const { pool } = require('../src/db/pool');

let server;
let baseUrl;

let leaderToken;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const leaderRes = await login('leader01', 'password123');
  leaderToken = (await leaderRes.json()).accessToken;
});

after(async () => {
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

async function createEvent(token, body) {
  return fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

async function getRecommendations(token, eventId) {
  return fetch(`${baseUrl}/api/events/${eventId}/recommendations`, {
    headers: authHeaders(token),
  });
}

async function insertRestaurant({ name, cost_per_person, avg_satisfaction_score }) {
  const result = await pool.query(
    'INSERT INTO restaurants (name, cost_per_person, avg_satisfaction_score) VALUES ($1,$2,$3) RETURNING id',
    [name, cost_per_person, avg_satisfaction_score]
  );
  return result.rows[0].id;
}

async function insertFinishedEvent(event_date, confirmed_restaurant_id) {
  const result = await pool.query(
    "INSERT INTO events (event_date, headcount, status, confirmed_restaurant_id) VALUES ($1,$2,'종료',$3) RETURNING id",
    [event_date, 4, confirmed_restaurant_id]
  );
  return result.rows[0].id;
}

test('1. C3 - 예산 미입력 이벤트 추천 조회 -> 400, 예산 안내 메시지', async () => {
  const createRes = await createEvent(leaderToken, {
    event_date: '2026-09-20',
    headcount: 4,
  });
  const created = await createRes.json();

  const res = await getRecommendations(leaderToken, created.id);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, '예산을 먼저 입력하세요');
});

test('2. C6 - 예산 조건 만족 식당 0건 -> 200, 빈 배열 + 안내 메시지', async () => {
  const createRes = await createEvent(leaderToken, {
    event_date: '2026-09-21',
    budget_per_person: 1000,
    headcount: 4,
  });
  const created = await createRes.json();

  const res = await getRecommendations(leaderToken, created.id);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.recommendations, []);
  assert.equal(body.message, '조건에 맞는 추천 결과가 없습니다');
});

test('3. C5 - 저평점 식당은 후보에 남되 lowest_priority true, 정상 식당보다 뒤에 위치', async () => {
  const suffix = Date.now();
  const lowScoreId = await insertRestaurant({
    name: `테스트식당_C3_저평점_${suffix}`,
    cost_per_person: 20000,
    avg_satisfaction_score: 2.0,
  });
  const normalId = await insertRestaurant({
    name: `테스트식당_C3_정상_${suffix}`,
    cost_per_person: 20000,
    avg_satisfaction_score: 4.0,
  });

  const createRes = await createEvent(leaderToken, {
    event_date: '2026-09-22',
    budget_per_person: 25000,
    headcount: 4,
  });
  const created = await createRes.json();

  const res = await getRecommendations(leaderToken, created.id);
  assert.equal(res.status, 200);
  const body = await res.json();

  const lowIdx = body.recommendations.findIndex((r) => r.restaurant_id === lowScoreId);
  const normalIdx = body.recommendations.findIndex((r) => r.restaurant_id === normalId);
  assert.ok(lowIdx >= 0);
  assert.ok(normalIdx >= 0);
  assert.equal(body.recommendations[lowIdx].lowest_priority, true);
  assert.equal(body.recommendations[normalIdx].lowest_priority, false);
  assert.ok(normalIdx < lowIdx);
});

test('4. C5 - 최근 방문 식당은 만족도가 높아도 lowest_priority true', async () => {
  const suffix = Date.now();
  const recentVisitId = await insertRestaurant({
    name: `테스트식당_C5_최근방문_${suffix}`,
    cost_per_person: 20000,
    avg_satisfaction_score: 4.5,
  });
  await insertFinishedEvent('2099-01-01', recentVisitId);

  const createRes = await createEvent(leaderToken, {
    event_date: '2026-09-23',
    budget_per_person: 25000,
    headcount: 4,
  });
  const created = await createRes.json();

  const res = await getRecommendations(leaderToken, created.id);
  assert.equal(res.status, 200);
  const body = await res.json();

  const idx = body.recommendations.findIndex((r) => r.restaurant_id === recentVisitId);
  assert.ok(idx >= 0);
  assert.equal(body.recommendations[idx].lowest_priority, true);
});

test('5. 정렬 검증 - lowest_priority false 그룹이 먼저(score 내림차순), true 그룹이 뒤(score 내림차순)', async () => {
  const suffix = Date.now();
  const cost = 22000;

  const normalHigh = await insertRestaurant({
    name: `테스트식당_정렬_정상고점_${suffix}`,
    cost_per_person: cost,
    avg_satisfaction_score: 4.8,
  });
  const normalLow = await insertRestaurant({
    name: `테스트식당_정렬_정상저점_${suffix}`,
    cost_per_person: cost,
    avg_satisfaction_score: 3.0,
  });
  const lowScore = await insertRestaurant({
    name: `테스트식당_정렬_저평점_${suffix}`,
    cost_per_person: cost,
    avg_satisfaction_score: 2.0,
  });
  const recentVisit = await insertRestaurant({
    name: `테스트식당_정렬_최근방문_${suffix}`,
    cost_per_person: cost,
    avg_satisfaction_score: 4.9,
  });
  await insertFinishedEvent('2099-01-02', recentVisit);

  const createRes = await createEvent(leaderToken, {
    event_date: '2026-09-24',
    budget_per_person: cost,
    headcount: 4,
  });
  const created = await createRes.json();

  const res = await getRecommendations(leaderToken, created.id);
  assert.equal(res.status, 200);
  const body = await res.json();

  const ids = new Set([normalHigh, normalLow, lowScore, recentVisit]);
  const ours = body.recommendations.filter((r) => ids.has(r.restaurant_id));

  const firstLowestIdx = ours.findIndex((r) => r.lowest_priority);
  const normalGroup = firstLowestIdx === -1 ? ours : ours.slice(0, firstLowestIdx);
  const lowestGroup = firstLowestIdx === -1 ? [] : ours.slice(firstLowestIdx);

  assert.ok(normalGroup.every((r) => r.lowest_priority === false));
  assert.ok(lowestGroup.every((r) => r.lowest_priority === true));

  for (let i = 1; i < normalGroup.length; i += 1) {
    assert.ok(normalGroup[i - 1].score >= normalGroup[i].score);
  }
  for (let i = 1; i < lowestGroup.length; i += 1) {
    assert.ok(lowestGroup[i - 1].score >= lowestGroup[i].score);
  }
});

test('6. 존재하지 않는 이벤트 id -> 404', async () => {
  const res = await getRecommendations(leaderToken, 999999999);
  assert.equal(res.status, 404);
});

test('7. 토큰 없이 조회 -> 401', async () => {
  const createRes = await createEvent(leaderToken, {
    event_date: '2026-09-25',
    budget_per_person: 20000,
    headcount: 4,
  });
  const created = await createRes.json();

  const res = await fetch(`${baseUrl}/api/events/${created.id}/recommendations`);
  assert.equal(res.status, 401);
});
