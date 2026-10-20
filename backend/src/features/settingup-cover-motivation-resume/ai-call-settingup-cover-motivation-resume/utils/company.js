const { BLACKLISTED_DOMAINS } = require('../config/constants');

function normalizeCompanyName(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/\b(inc\.?|inc|llc|ltd|limited|corp|corporation)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidLink(link) {
  if (!link || typeof link !== 'string') return false;
  const lower = link.toLowerCase();
  return !BLACKLISTED_DOMAINS.some((domain) => lower.includes(domain));
}

module.exports = { normalizeCompanyName, isValidLink };
