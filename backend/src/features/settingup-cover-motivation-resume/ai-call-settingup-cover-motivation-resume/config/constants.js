// ─── Timing & limits ────────────────────────────────────────────────────────

const DELAY_BETWEEN_REQUESTS = 1500;
const TEXT_LIMIT = 5000;
const AI_TIMEOUT_MS = 180_000;
const AI_MAX_RETRIES = 3;

// ─── Retry policy ───────────────────────────────────────────────────────────

const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT'
]);

// ─── Company research ───────────────────────────────────────────────────────

const BLACKLISTED_DOMAINS = [
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'wikipedia.org',
  'glassdoor.com',
  'indeed.com'
];

module.exports = {
  DELAY_BETWEEN_REQUESTS,
  TEXT_LIMIT,
  AI_TIMEOUT_MS,
  AI_MAX_RETRIES,
  RETRYABLE_HTTP_STATUSES,
  RETRYABLE_ERROR_CODES,
  BLACKLISTED_DOMAINS
};
