const cheerio = require('cheerio');

const { TEXT_LIMIT } = require('../config/constants');
const { safeRequest } = require('../utils/http');
const { isValidLink } = require('../utils/company');

async function findCompanyWebsite(companyName) {
  const response = await safeRequest('https://google.serper.dev/search', 'post', {
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    data: { q: `${companyName} official website`, num: 5 }
  });

  const organic = Array.isArray(response?.data?.organic) ? response.data.organic : [];
  for (const result of organic) {
    if (isValidLink(result?.link)) return result.link;
  }

  return null;
}

async function scrapePageText(url) {
  const response = await safeRequest(url, 'get');
  const $ = cheerio.load(response.data ?? '');
  $('script, style, noscript, img, svg').remove();
  const text = ($('body').text() || $.root().text()).replace(/\s+/g, ' ').trim();
  return text.slice(0, TEXT_LIMIT);
}

async function fetchCompanyDetails(companyName) {
  try {
    const website = await findCompanyWebsite(companyName);
    if (!website) return { status: 'not_found', website: null, details: null };

    const details = await scrapePageText(website);
    return { status: 'success', website, details };
  } catch (err) {
    return { status: 'error', website: null, details: err.message };
  }
}

module.exports = { findCompanyWebsite, scrapePageText, fetchCompanyDetails };
