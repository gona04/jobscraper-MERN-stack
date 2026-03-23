import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.mjs';

test('GET / responds with server status message', async () => {
  const app = createApp();
  const server = app.listen(0);

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const text = await response.text();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(text, 'Server is running');
});
