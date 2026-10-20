const { log } = require('./log');

function safeParseJSON(raw) {
  try {
    const cleaned = String(raw ?? '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    log(`Warning: failed to parse JSON — ${err.message}`);
    return {};
  }
}

module.exports = { safeParseJSON };
