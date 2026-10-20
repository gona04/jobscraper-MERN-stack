const axios = require('axios');

async function safeRequest(url, method, options = {}) {
  try {
    return await axios({ url, method, timeout: 20_000, ...options });
  } catch (err) {
    const status = err.response?.status ? ` (status ${err.response.status})` : '';
    throw new Error(`${method.toUpperCase()} ${url}${status} failed: ${err.message}`);
  }
}

module.exports = { safeRequest };
