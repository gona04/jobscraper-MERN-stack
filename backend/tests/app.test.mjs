import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.mjs';

async function withTestServer(app, assertions) {
  const server = app.listen(0);

  try {
    const { port } = server.address();
    await assertions(port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('GET / responds with server status message', async () => {
  await withTestServer(createApp(), async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const text = await response.text();

    assert.equal(response.status, 200);
    assert.equal(text, 'Server is running');
  });
});

test('POST /jobs is a compatibility alias for custom job submissions', async () => {
  const app = createApp({
    customJobController: (_req, res) => {
      res.json({ success: true, count: 1, portal: 'custom', jobs: [] });
    }
  });

  await withTestServer(app, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Frontend Developer\nhttps://example.com/job' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { success: true, count: 1, portal: 'custom', jobs: [] });
  });
});
