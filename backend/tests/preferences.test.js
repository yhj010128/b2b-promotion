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
let eventId;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const leaderRes = await login('leader01', 'password123');
  leaderToken = (await leaderRes.json()).accessToken;

  const memberRes = await login('member01', 'password123');
  memberToken = (await memberRes.json()).accessToken;

  const eventRes = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: authHeaders(leaderToken),
    body: JSON.stringify({ event_date: '2026-09-20', headcount: 6 }),
  });
  eventId = (await eventRes.json()).id;
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

async function submitPreference(token, id, body) {
  return fetch(`${baseUrl}/api/events/${id}/preferences`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

test('팀원이 의견 제출 -> 200, event_id/user_id와 함께 저장', async () => {
  const res = await submitPreference(memberToken, eventId, {
    wanted_menu: '삼겹살',
    disliked_food: '회',
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.event_id, eventId);
  assert.equal(body.wanted_menu, '삼겹살');
  assert.equal(body.disliked_food, '회');
  assert.ok(body.user_id);
});

test('팀장도 자신의 의견을 제출할 수 있음', async () => {
  const res = await submitPreference(leaderToken, eventId, { wanted_menu: '초밥' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.wanted_menu, '초밥');
});

test('미인증 요청은 401 (C1)', async () => {
  const res = await fetch(`${baseUrl}/api/events/${eventId}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wanted_menu: '치킨' }),
  });
  assert.equal(res.status, 401);
});

test('동일 사용자 재제출은 기존 행을 갱신함 (행이 늘지 않음)', async () => {
  const first = await submitPreference(memberToken, eventId, { wanted_menu: '삼겹살' });
  const firstBody = await first.json();

  const second = await submitPreference(memberToken, eventId, {
    wanted_menu: '냉면',
    disliked_food: '오이',
  });
  assert.equal(second.status, 200);
  const secondBody = await second.json();

  assert.equal(secondBody.id, firstBody.id);
  assert.equal(secondBody.wanted_menu, '냉면');
  assert.equal(secondBody.disliked_food, '오이');

  const count = await pool.query(
    'SELECT count(*) FROM preferences WHERE event_id = $1 AND user_id = $2',
    [eventId, secondBody.user_id]
  );
  assert.equal(count.rows[0].count, '1');
});

test('존재하지 않는 회식 일정에 제출 시 404', async () => {
  const res = await submitPreference(leaderToken, 999999999, { wanted_menu: '떡볶이' });
  assert.equal(res.status, 404);
});
