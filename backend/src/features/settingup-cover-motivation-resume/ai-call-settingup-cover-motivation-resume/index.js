const { normalizeCompanyName, isValidLink } = require('./utils/company');
const { safeParseJSON } = require('./utils/json');
const { safeRequest } = require('./utils/http');
const { loadCache, saveCache } = require('./cache/companyCache');
const { findCompanyWebsite, scrapePageText, fetchCompanyDetails } = require('./research/companyResearch');
const { resolveProviderConfig } = require('./providers/resolveConfig');
const { callAI } = require('./providers/callAI');
const { processJob } = require('./pipeline/processJob');
const { main } = require('./pipeline/main');

module.exports = {
  normalizeCompanyName,
  isValidLink,
  safeParseJSON,
  loadCache,
  saveCache,
  safeRequest,
  findCompanyWebsite,
  scrapePageText,
  fetchCompanyDetails,
  resolveProviderConfig,
  callAI,
  processJob,
  main
};
