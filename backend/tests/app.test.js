'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const ALLOWED_ORIGIN = 'http://allowed.example.com';
process.env.CLIENT_ORIGIN = ALLOWED_ORIGIN;

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /health returns 200 and { status: "ok" }', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { status: 'ok' });
});

test('CORS: allowed origin gets echoed back in Access-Control-Allow-Origin', async () => {
  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: ALLOWED_ORIGIN },
  });
  assert.equal(res.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
});

test('CORS: disallowed origin does not get Access-Control-Allow-Origin echoed', async () => {
  const disallowedOrigin = 'http://evil.example.com';
  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: disallowedOrigin },
  });
  const allowOrigin = res.headers.get('access-control-allow-origin');
  assert.notEqual(allowOrigin, disallowedOrigin);
});
