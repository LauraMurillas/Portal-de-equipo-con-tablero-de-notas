import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './server.js';
import http from 'node:http';

test('health endpoint responds', async () => {
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  await new Promise<void>(resolve => server.close(() => resolve()));
});
