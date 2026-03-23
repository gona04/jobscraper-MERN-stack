import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScrapeRequest } from '../src/models/scrapeRequestModel.mjs';

test('validateScrapeRequest returns error when portal is missing', () => {
  const result = validateScrapeRequest({ url: 'https://example.com' });

  assert.equal(result.isValid, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, 'Portal is required (linkedin | meetfrank)');
});

test('validateScrapeRequest returns error when url is missing', () => {
  const result = validateScrapeRequest({ portal: 'linkedin' });

  assert.equal(result.isValid, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, 'URL is required');
});

test('validateScrapeRequest accepts valid params', () => {
  const result = validateScrapeRequest({
    portal: 'linkedin',
    url: 'https://example.com/jobs'
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.data, {
    portal: 'linkedin',
    url: 'https://example.com/jobs'
  });
});
