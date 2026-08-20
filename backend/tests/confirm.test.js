'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/app');
const { pool } = require('../src/db/pool');

let server;
let baseUrl;

let leaderToken;
let memberToken;

const createdEventIds = [];
const createdRestaurantIds = [];

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const leaderRes = await login('leader01', 'password123');
  leaderToken = (await leaderRes.json()).accessToken;

  const memberRes = await login('member01', 'password123');
  memberToken = (await memberRes.json()).accessToken;
});

after(async () => {
  // 미래 날짜로 만든 이벤트/식당은 "최근 방문" 판정 창을 오염시키므로 반드시 정리한다.
  if (createdEventIds.length > 0) {
    await pool.query('DELETE FROM events WHERE id = ANY($1)', [createdEventIds]);
  }
  if (createdRestaurantIds.length > 0) {
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

async function createEvent(token, body) {
  const res = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 201) {
    const data = await res.clone().json();
    createdEventIds.push(data.id);
  }
  return res;
}

async function getEvent(token, id) {
  return fetch(`${baseUrl}/api/events/${id}`, { headers: authHeaders(token) });
}

async function confirmEvent(token, id, restaurantId) {
  return fetch(`${baseUrl}/api/events/${id}/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ restaurant_id: restaurantId }),
  });
}

async function closeEvent(token, id) {
  return fetch(`${baseUrl}/api/events/${id}/close`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

async function insertRestaurant(name, costPerPerson, avgScore) {
  const result = await pool.query(
    'INSERT INTO restaurants (name, cost_per_person, avg_satisfaction_score) VALUES ($1, $2, $3) RETURNING id',
    [name, costPerPerson, avgScore]
  );
  createdRestaurantIds.push(result.rows[0].id);
  return result.rows[0].id;
}

test('팀장이 확정하면 confirmed_restaurant_id 저장되고 상태가 확정으로 전이됨', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_confirm1_${Date.now()}`, 20000, 4.0);
  const eventRes = await createEvent(leaderToken, {
    event_date: '2026-09-25',
    budget_per_person: 25000,
    headcount: 4,
  });
  const event = await eventRes.json();

  const res = await confirmEvent(leaderToken, event.id, restaurantId);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.confirmed_restaurant_id, restaurantId);
  assert.equal(body.status, '확정');
});

test('C2: 팀원이 확정 시도하면 403, 데이터는 변경되지 않음', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_confirm2_${Date.now()}`, 20000, 4.0);
  const eventRes = await createEvent(leaderToken, {
    event_date: '2026-09-26',
    budget_per_person: 25000,
    headcount: 4,
  });
  const event = await eventRes.json();

  const res = await confirmEvent(memberToken, event.id, restaurantId);
  assert.equal(res.status, 403);

  const getRes = await getEvent(leaderToken, event.id);
  const getBody = await getRes.json();
  assert.equal(getBody.status, '모집중');
  assert.equal(getBody.confirmed_restaurant_id, null);
});

test('C6: 추천 후보 0건 상황에서 팀장의 수동 확정이 성공함', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_confirm_c6_${Date.now()}`, 50000, 3.5);
  const eventRes = await createEvent(leaderToken, {
    event_date: '2026-09-27',
    budget_per_person: 1000, // 모든 식당보다 낮은 예산 -> 추천 후보 0건
    headcount: 4,
  });
  const event = await eventRes.json();

  const recRes = await fetch(`${baseUrl}/api/events/${event.id}/recommendations`, {
    headers: authHeaders(leaderToken),
  });
  const recBody = await recRes.json();
  assert.equal(recBody.recommendations.length, 0);

  // 후보가 없어도 팀장이 restaurant_id를 직접 지정해 확정 가능
  const res = await confirmEvent(leaderToken, event.id, restaurantId);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.confirmed_restaurant_id, restaurantId);
  assert.equal(body.status, '확정');
});

test('확정 후 종료까지 마치면 해당 식당이 다음 추천의 C5 판단(최근 방문)에 반영됨', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_recency_${Date.now()}`, 20000, 4.8);

  // 이 테스트 실행 시점 기준 항상 가장 미래인 날짜를 사용해, 과거 테스트 실행에서 남은
  // 잔여 데이터(정리 로직 도입 전 데이터 등)와 순위가 섞이지 않게 한다.
  const farFutureDate = new Date(Date.now() + 200 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const eventRes = await createEvent(leaderToken, {
    event_date: farFutureDate,
    budget_per_person: 25000,
    headcount: 4,
  });
  const event = await eventRes.json();

  await confirmEvent(leaderToken, event.id, restaurantId);
  const closeRes = await closeEvent(leaderToken, event.id);
  assert.equal(closeRes.status, 200);

  const nextEventRes = await createEvent(leaderToken, {
    event_date: '2026-09-28',
    budget_per_person: 25000,
    headcount: 4,
  });
  const nextEvent = await nextEventRes.json();

  const recRes = await fetch(`${baseUrl}/api/events/${nextEvent.id}/recommendations`, {
    headers: authHeaders(leaderToken),
  });
  const recBody = await recRes.json();
  const candidate = recBody.recommendations.find((r) => r.restaurant_id === restaurantId);
  assert.ok(candidate, '방금 확정+종료한 식당이 후보에 포함되어야 함');
  assert.equal(candidate.lowest_priority, true, '만족도가 높아도 최근 방문 이력 때문에 최하위 배치되어야 함');
});

test('존재하지 않는 이벤트로 확정 시도 -> 404', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_confirm_404_${Date.now()}`, 20000, 4.0);
  const res = await confirmEvent(leaderToken, 999999999, restaurantId);
  assert.equal(res.status, 404);
});

test('존재하지 않는 식당으로 확정 시도 -> 404', async () => {
  const eventRes = await createEvent(leaderToken, {
    event_date: '2026-09-29',
    budget_per_person: 25000,
    headcount: 4,
  });
  const event = await eventRes.json();

  const res = await confirmEvent(leaderToken, event.id, 999999999);
  assert.equal(res.status, 404);
});

test('이미 확정된 이벤트를 다시 확정 시도 -> 409', async () => {
  const restaurantId = await insertRestaurant(`테스트식당_confirm_dup_${Date.now()}`, 20000, 4.0);
  const eventRes = await createEvent(leaderToken, {
    event_date: '2026-09-30',
    budget_per_person: 25000,
    headcount: 4,
  });
  const event = await eventRes.json();

  await confirmEvent(leaderToken, event.id, restaurantId);
  const res = await confirmEvent(leaderToken, event.id, restaurantId);
  assert.equal(res.status, 409);
});
