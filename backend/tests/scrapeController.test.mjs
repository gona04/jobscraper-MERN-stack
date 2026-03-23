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

test('scrapeController returns validation error for missing job_links', async () => {
  const controller = createScrapeController(async () => []);
  const req = { body: {} };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: 'job_links is required and must be a non-empty array'
  });
});

test('scrapeController returns scrape result from service', async () => {
  const fakeJobs = [{ title: 'Engineer', link: 'https://example.com/job/1' }];
  const controller = createScrapeController(async () => fakeJobs);
  const req = {
    body: {
      job_links: [
        { portal: 'linkedin', link: 'https://example.com' },
        { portal: 'meetfrank', link: 'https://meetfrank.com/jobs' }
      ]
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
    body: {
      job_links: [{ portal: 'linkedin', link: 'https://example.com' }]
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
