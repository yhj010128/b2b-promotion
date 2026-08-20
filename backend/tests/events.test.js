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

async function getEvent(token, id) {
  return fetch(`${baseUrl}/api/events/${id}`, {
    headers: authHeaders(token),
  });
}

async function closeEvent(token, id) {
  return fetch(`${baseUrl}/api/events/${id}/close`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

async function seedConfirmedEvent(event_date, headcount) {
  const result = await pool.query(
    "INSERT INTO events (event_date, headcount, status) VALUES ($1,$2,'확정') RETURNING id",
    [event_date, headcount]
  );
  return result.rows[0].id;
}

test('1. 팀장 토큰으로 등록 성공 -> 201, 모집중, 요청 필드 그대로 저장', async () => {
  const res = await createEvent(leaderToken, {
    event_date: '2026-09-10',
    budget_per_person: 30000,
    headcount: 8,
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id);
  assert.equal(body.event_date.slice(0, 10), '2026-09-10');
  assert.equal(body.budget_per_person, 30000);
  assert.equal(body.headcount, 8);
  assert.equal(body.status, '모집중');
  assert.ok('confirmed_restaurant_id' in body);
});

let recruitingEventId;

test('2. budget_per_person 생략 -> 201, null. 재조회해도 null 유지', async () => {
  const res = await createEvent(leaderToken, {
    event_date: '2026-09-11',
    headcount: 5,
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.budget_per_person, null);
  recruitingEventId = body.id;

  const getRes = await getEvent(leaderToken, body.id);
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.budget_per_person, null);
});

test('3. 팀원 토큰으로 등록 시도 -> 403', async () => {
  const res = await createEvent(memberToken, {
    event_date: '2026-09-12',
    headcount: 4,
  });
  assert.equal(res.status, 403);
});

test('4. 토큰 없이 등록 시도 -> 401', async () => {
  const res = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_date: '2026-09-13', headcount: 4 }),
  });
  assert.equal(res.status, 401);
});

test('5. 팀원 토큰으로 GET 조회 성공, 존재하지 않는 id는 404', async () => {
  const createRes = await createEvent(leaderToken, {
    event_date: '2026-09-14',
    budget_per_person: 20000,
    headcount: 6,
  });
  const created = await createRes.json();

  const res = await getEvent(memberToken, created.id);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, created.id);
  assert.equal(body.headcount, 6);

  const notFoundRes = await getEvent(memberToken, 999999999);
  assert.equal(notFoundRes.status, 404);
});

test('6. 확정 상태 이벤트를 팀장이 close -> 200, 종료. GET으로 영속 확인', async () => {
  const eventId = await seedConfirmedEvent('2026-09-15', 6);

  const res = await closeEvent(leaderToken, eventId);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, '종료');

  const getRes = await getEvent(leaderToken, eventId);
  const getBody = await getRes.json();
  assert.equal(getBody.status, '종료');
});

test('7. 모집중 상태 이벤트를 close -> 4xx, GET으로 모집중 유지 확인', async () => {
  const res = await closeEvent(leaderToken, recruitingEventId);
  assert.ok(res.status >= 400 && res.status < 500);

  const getRes = await getEvent(leaderToken, recruitingEventId);
  const getBody = await getRes.json();
  assert.equal(getBody.status, '모집중');
});

test('8. 확정 상태 이벤트를 팀원이 close -> 403, GET으로 확정 유지 확인', async () => {
  const eventId = await seedConfirmedEvent('2026-09-16', 4);

  const res = await closeEvent(memberToken, eventId);
  assert.equal(res.status, 403);

  const getRes = await getEvent(leaderToken, eventId);
  const getBody = await getRes.json();
  assert.equal(getBody.status, '확정');
});

test('9. 존재하지 않는 id로 close -> 404', async () => {
  const res = await closeEvent(leaderToken, 999999999);
  assert.equal(res.status, 404);
});
