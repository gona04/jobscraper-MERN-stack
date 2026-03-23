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

test('customJobController returns validation error for unsupported body', async () => {
  const controller = createCustomJobController(async () => ({ jobs: [], savedPath: '' }));
  const req = { body: {} };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: 'Send either {"content":"..."}, {"entries":[{"content":"..."}]}, or an array of {"content":"..."}'
  });
});

test('customJobController supports root array payload', async () => {
  const fakeJobs = [{ title: 'Frontend Developer', link: 'https://example.com', details: { title: 'Frontend Developer', description: 'desc', visaSponsorship: false, relocationSupport: false }, portal: 'custom' }];
  let receivedInput;
  const controller = createCustomJobController(async (input) => {
    receivedInput = input;
    return {
      jobs: fakeJobs,
      savedPath: '/tmp/data/custom/custom.json'
    };
  });

  const req = { body: [{ content: 'job 1' }, { content: 'job 2' }] };
  const res = createMockResponse();

  await controller(req, res);

  assert.deepEqual(receivedInput, ['job 1', 'job 2']);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    count: 1,
    portal: 'custom',
    outputFile: '/tmp/data/custom/custom.json',
    jobs: fakeJobs
  });
});
