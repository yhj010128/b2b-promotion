'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { authMiddleware } = require('../src/middleware/auth.middleware');

const ORIGINAL_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES;

let server;
let baseUrl;

// 별도의 더미 앱: authMiddleware가 보호하는 라우트만 검증한다.
let protectedServer;
let protectedBaseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const protectedApp = express();
  protectedApp.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({ user: req.user });
  });
  protectedServer = http.createServer(protectedApp);
  await new Promise((resolve) => protectedServer.listen(0, resolve));
  protectedBaseUrl = `http://localhost:${protectedServer.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => protectedServer.close(resolve));
});

async function login(login_id, password) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id, password }),
  });
}

test('로그인 성공: leader01 / password123 -> 200, accessToken/refreshToken 반환, role은 팀장', async () => {
  const res = await login('leader01', 'password123');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.accessToken, 'string');
  assert.equal(typeof body.refreshToken, 'string');

  const decoded = jwt.decode(body.accessToken);
  assert.equal(decoded.role, '팀장');
  assert.ok(decoded.sub);
});

test('로그인 실패: 잘못된 비밀번호는 401', async () => {
  const res = await login('leader01', 'wrong-password');
  assert.equal(res.status, 401);
});

test('C1: 미들웨어로 보호된 라우트는 토큰 없이 호출 시 401', async () => {
  const res = await fetch(`${protectedBaseUrl}/protected`);
  assert.equal(res.status, 401);
});

let usedRefreshToken; // rotation 테스트에서 재사용할 구 refreshToken

test('만료된 access token은 401, refresh로 재발급 후 재요청은 성공', async () => {
  process.env.JWT_ACCESS_EXPIRES = '1s';
  let loginBody;
  try {
    const res = await login('leader01', 'password123');
    assert.equal(res.status, 200);
    loginBody = await res.json();
  } finally {
    process.env.JWT_ACCESS_EXPIRES = ORIGINAL_ACCESS_EXPIRES;
  }

  await new Promise((resolve) => setTimeout(resolve, 1100));

  const expiredToken = loginBody.accessToken;
  for (let i = 0; i < 3; i += 1) {
    const res = await fetch(`${protectedBaseUrl}/protected`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(res.status, 401);
  }

  const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
  });
  assert.equal(refreshRes.status, 200);
  const refreshBody = await refreshRes.json();
  assert.equal(typeof refreshBody.accessToken, 'string');
  assert.equal(typeof refreshBody.refreshToken, 'string');

  const retryRes = await fetch(`${protectedBaseUrl}/protected`, {
    headers: { Authorization: `Bearer ${refreshBody.accessToken}` },
  });
  assert.equal(retryRes.status, 200);

  usedRefreshToken = loginBody.refreshToken;
});

test('rotation: 앞서 사용된 구 refreshToken으로 재요청하면 401', async () => {
  const res = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: usedRefreshToken }),
  });
  assert.equal(res.status, 401);
});

test('역할 클레임: member01 로그인 시 accessToken의 role은 팀원', async () => {
  const res = await login('member01', 'password123');
  assert.equal(res.status, 200);
  const body = await res.json();
  const decoded = jwt.decode(body.accessToken);
  assert.equal(decoded.role, '팀원');
});
