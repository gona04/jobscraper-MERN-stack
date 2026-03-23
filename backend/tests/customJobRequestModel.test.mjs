import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomJobRequest } from '../src/models/customJobRequestModel.mjs';

test('validateCustomJobRequest rejects missing content', () => {
  const result = validateCustomJobRequest({});

  assert.equal(result.isValid, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, 'content is required and must be a non-empty string');
});

test('validateCustomJobRequest accepts non-empty content', () => {
  const result = validateCustomJobRequest({ content: '  some jobs  ' });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.data, { content: 'some jobs' });
});
