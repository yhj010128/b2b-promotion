'use strict';

const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// pool.js constructs a pg.Pool at module load time using resolveConnectionString(),
// so at least one of the env vars must be set before the initial require to avoid
// throwing during module load. The scenarios below then call resolveConnectionString()
// directly with different env combinations, independent of that initial load.
let resolveConnectionString;

before(() => {
  process.env.DATABASE_URL = 'postgres://placeholder-for-initial-load';
  delete process.env.DB_CONN_STRING;

  const poolModule = require('../src/db/pool');
  resolveConnectionString = poolModule.resolveConnectionString;
  assert.equal(typeof resolveConnectionString, 'function');
});

beforeEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.DB_CONN_STRING;
});

test('DATABASE_URL and DB_CONN_STRING both set: DATABASE_URL wins', () => {
  process.env.DATABASE_URL = 'postgres://from-database-url';
  process.env.DB_CONN_STRING = 'postgres://from-db-conn-string';

  assert.equal(resolveConnectionString(), 'postgres://from-database-url');
});

test('only DATABASE_URL set: returns its value', () => {
  process.env.DATABASE_URL = 'postgres://only-database-url';

  assert.equal(resolveConnectionString(), 'postgres://only-database-url');
});

test('only DB_CONN_STRING set: returns its value', () => {
  process.env.DB_CONN_STRING = 'postgres://only-db-conn-string';

  assert.equal(resolveConnectionString(), 'postgres://only-db-conn-string');
});

test('neither set: throws', () => {
  assert.throws(() => resolveConnectionString());
});
