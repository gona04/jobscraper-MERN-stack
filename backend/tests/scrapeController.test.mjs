import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrapeController } from '../src/controllers/scrapeController.mjs';

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('scrapeController returns validation error for missing portal', async () => {
  const controller = createScrapeController(async () => []);
  const req = { query: { url: 'https://example.com' } };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: 'Portal is required (linkedin | meetfrank)'
  });
});

test('scrapeController returns scrape result from service', async () => {
  const fakeJobs = [{ title: 'Engineer', link: 'https://example.com/job/1' }];
  const controller = createScrapeController(async () => fakeJobs);
  const req = {
    query: {
      portal: 'linkedin',
      url: 'https://example.com'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    count: 1,
    jobs: fakeJobs
  });
});

test('scrapeController handles service failure', async () => {
  const controller = createScrapeController(async () => {
    throw new Error('Service failed');
  });
  const req = {
    query: {
      portal: 'linkedin',
      url: 'https://example.com'
    }
  };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Service failed'
  });
});
