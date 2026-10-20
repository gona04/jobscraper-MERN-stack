const { PROVIDER_REGISTRY } = require('./registry');
const {
  AI_TIMEOUT_MS,
  AI_MAX_RETRIES,
  DELAY_BETWEEN_REQUESTS,
  RETRYABLE_HTTP_STATUSES,
  RETRYABLE_ERROR_CODES
} = require('../config/constants');
const { safeRequest } = require('../utils/http');
const { log, delay } = require('../utils/log');

async function callAI(providerConfig, systemPrompt, userPrompt) {
  const { provider, apiKey, model } = providerConfig;
  const registry = PROVIDER_REGISTRY[provider];

  if (!registry) throw new Error(`Unknown provider: ${provider}`);

  const requestOptions = {
    timeout: AI_TIMEOUT_MS,
    headers: registry.buildHeaders(apiKey),
    data: registry.buildBody(model, systemPrompt, userPrompt)
  };

  for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      const response = await safeRequest(registry.url, 'post', requestOptions);

      if (response.status !== 200) {
        throw new Error(`Unexpected HTTP status: ${response.status}`);
      }

      const content = registry.parseResponse(response.data);
      await delay(DELAY_BETWEEN_REQUESTS);
      return content;
    } catch (err) {
      const statusMatch =
        err.message.match(/\(status (\d+)\)/) ||
        err.message.match(/Unexpected HTTP status: (\d+)/);
      const status = statusMatch ? Number(statusMatch[1]) : null;

      const isRetryable =
        (status !== null && RETRYABLE_HTTP_STATUSES.has(status)) ||
        RETRYABLE_ERROR_CODES.has(err.code) ||
        err.message.includes('timeout');

      if (!isRetryable || attempt >= AI_MAX_RETRIES) throw err;

      const backoffMs = Math.min(2000 * 2 ** (attempt - 1), 10_000);
      log(
        `[${provider}] Attempt ${attempt}/${AI_MAX_RETRIES} failed: ${err.message}. ` +
        `Retrying in ${backoffMs}ms…`
      );
      await delay(backoffMs);
    }
  }
}

module.exports = { callAI };
