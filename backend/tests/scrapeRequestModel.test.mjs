import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScrapeRequest } from '../src/models/scrapeRequestModel.mjs';

test('validateScrapeRequest returns error when job_links is missing', () => {
  const result = validateScrapeRequest({});

  assert.equal(result.isValid, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, 'job_links is required and must be a non-empty array');
});

test('validateScrapeRequest returns error when portal is missing', () => {
  const result = validateScrapeRequest({
    job_links: [{ link: 'https://example.com' }]
  });

  assert.equal(result.isValid, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, 'job_links[0].portal is required');
});

test('validateScrapeRequest returns error when link is missing', () => {
  const result = validateScrapeRequest({
    job_links: [{ portal: 'linkedin' }]
  });

  assert.equal(result.isValid, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, 'job_links[0].link is required');
});

test('validateScrapeRequest accepts valid payload', () => {
  const result = validateScrapeRequest({
    job_links: [
      { portal: 'linkedin', link: 'https://example.com/jobs' },
      { portal: 'meetfrank', link: 'https://meetfrank.com/jobs' }
    ]
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.data, {
    jobLinks: [
      { portal: 'linkedin', link: 'https://example.com/jobs' },
      { portal: 'meetfrank', link: 'https://meetfrank.com/jobs' }
    ]
  });
});
