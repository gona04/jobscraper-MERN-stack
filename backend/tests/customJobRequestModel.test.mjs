import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomJobRequest } from '../src/models/customJobRequestModel.mjs';

test('validateCustomJobRequest rejects unsupported payload format', () => {
  const result = validateCustomJobRequest({});

  assert.equal(result.isValid, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, 'Send either {"content":"..."}, {"entries":[{"content":"..."}]}, or an array of {"content":"..."}');
});

test('validateCustomJobRequest accepts single content payload', () => {
  const result = validateCustomJobRequest({ content: '  some jobs  ' });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.data, { contents: ['some jobs'] });
});

test('validateCustomJobRequest accepts entries array payload', () => {
  const result = validateCustomJobRequest({
    entries: [
      { content: ' First job ' },
      { content: ' Second job ' }
    ]
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.data, { contents: ['First job', 'Second job'] });
});

test('validateCustomJobRequest accepts root array payload', () => {
  const result = validateCustomJobRequest([
    { content: ' First job ' },
    { content: ' Second job ' }
  ]);

  assert.equal(result.isValid, true);
  assert.deepEqual(result.data, { contents: ['First job', 'Second job'] });
});
