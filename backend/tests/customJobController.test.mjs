import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomJobController } from '../src/controllers/customJobController.mjs';

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

test('customJobController returns validation error for empty body', async () => {
  const controller = createCustomJobController(async () => ({ jobs: [], savedPath: '' }));
  const req = { body: {} };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: 'content is required and must be a non-empty string'
  });
});

test('customJobController returns transformed and saved jobs', async () => {
  const fakeJobs = [{ title: 'Frontend Developer', link: 'https://example.com', details: { title: 'Frontend Developer', description: 'desc', visaSponsorship: false, relocationSupport: false }, portal: 'custom' }];
  const controller = createCustomJobController(async () => ({
    jobs: fakeJobs,
    savedPath: '/tmp/data/custom/custom.json'
  }));

  const req = { body: { content: 'sample' } };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    count: 1,
    portal: 'custom',
    outputFile: '/tmp/data/custom/custom.json',
    jobs: fakeJobs
  });
});
