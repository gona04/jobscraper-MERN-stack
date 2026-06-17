const fs = require('fs');
const path = require('path');

/* ===========================
CONFIG
=========================== */

const CACHE_FILENAME = 'company_cache.json';
const FINANCIAL_TEXT_LIMIT = 12000;
const SERPER_SEARCH_URL = 'https://google.serper.dev/search';
const FINANCIAL_SEARCH_TERMS = [
  'latest annual report investor relations',
  'financial report investor relations',
  'shareholder letter annual report',
  'earnings report presentation',
  'strategic outlook investor relations'
];
const FINANCIAL_KEYWORDS = [
  'strategy',
  'strategic',
  'priority',
  'priorities',
  'growth',
  'improve',
  'improvement',
  'optimize',
  'optimization',
  'transform',
  'transformation',
  'modernize',
  'efficiency',
  'cost',
  'margin',
  'retention',
  'customer',
  'risk',
  'challenge',
  'headwind',
  'investment',
  'innovation',
  'digital',
  'operational'
];

/* ===========================
UTILS
=========================== */

function getDateFolderName() {
const now = new Date();
return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function normalizeJob(job) {
return {
...job,
companyName: job.companyName || job.company_name || '',
};
}

function normalizeCompanyName(name) {
return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripHTML(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ===========================
FILE HELPERS
=========================== */

function readJsonArray(filePath) {
try {
const raw = fs.readFileSync(filePath, 'utf8');
return JSON.parse(raw);
} catch (err) {
console.log("❌ JSON read error:", err.message);
return [];
}
}

function readCache(filePath) {
try {
if (!fs.existsSync(filePath)) return {};
return JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch {
return {};
}
}

function saveCache(filePath, cache) {
try {
fs.writeFileSync(filePath, JSON.stringify(cache, null, 2));
} catch (err) {
console.log("⚠️ Cache save error:", err.message);
}
}

/* ===========================
HTML CLEAN (SAFE)
=========================== */

function cleanHTML(html) {
if (!html) return '';

return stripHTML(html).slice(0, 2000);
}

/* ===========================
SCRAPE WEBSITE
=========================== */

async function scrapeWebsite(url) {
try {
const res = await fetch(url, {
headers: { 'User-Agent': 'Mozilla/5.0' },
});


if (!res.ok) {
  throw new Error("HTTP " + res.status);
}

const html = await res.text();

return {
  company_status: 'success',
  company_website: url,
  company_details: cleanHTML(html),
};

} catch (err) {
return {
company_status: 'error',
company_website: null,
company_details: null,
company_error: err.message,
};
}
}

/* ===========================
DIRECT DOMAIN STRATEGY
=========================== */

async function fetchCompanyDirect(company) {
  const name = company
    .split('/')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const domains = [
    `https://www.${name}.com`,
    `https://${name}.com`,
    `https://www.${name}.io`,
    `https://${name}.io`,
  ];

  for (const url of domains) {
    try {
      console.log("🌐 Trying:", url);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (res.ok) {
        const html = await res.text();

        return {
          company_status: 'success',
          company_website: url,
          company_details: cleanHTML(html),
        };
      }
    } catch {}
  }

  return {
    company_status: 'not_found',
    company_website: null,
    company_details: null,
  };
}

/* ===========================
FINANCIAL RESEARCH PIPELINE
=========================== */

function getFinancialFallback(status, error) {
  return {
    financial_research_status: status,
    financial_research_error: error || null,
    financial_research_source: null,
    financial_research_sources: [],
    financial_research_summary: null,
    strategic_objectives: []
  };
}

async function serperSearch(query) {
  if (!process.env.SERPER_API_KEY) {
    throw new Error('SERPER_API_KEY is not configured');
  }

  const res = await fetch(SERPER_SEARCH_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query, num: 5 })
  });

  if (!res.ok) {
    throw new Error(`Serper HTTP ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data.organic) ? data.organic : [];
}

function scoreFinancialSource(result) {
  const haystack = `${result.title || ''} ${result.link || ''} ${result.snippet || ''}`.toLowerCase();
  let score = 0;

  if (/investors?|investor-relations|ir\./.test(haystack)) score += 35;
  if (/annual report|10-k|form 10-k/.test(haystack)) score += 30;
  if (/sec\.gov|edgar/.test(haystack)) score += 25;
  if (/earnings|presentation|shareholder letter/.test(haystack)) score += 20;
  if (/financial report|quarterly report|results/.test(haystack)) score += 15;
  if (/pdf/.test(haystack)) score += 5;
  if (/linkedin|facebook|instagram|wikipedia|glassdoor|indeed/.test(haystack)) score -= 50;

  return score;
}

async function findFinancialSources(company) {
  const searches = FINANCIAL_SEARCH_TERMS.map((term) => serperSearch(`${company} ${term}`));
  const settled = await Promise.allSettled(searches);
  const results = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)
    .map((result) => ({
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || '',
      score: scoreFinancialSource(result)
    }))
    .filter((result) => result.link && result.score > 0)
    .sort((a, b) => b.score - a.score);

  return uniqueBy(results, (result) => result.link).slice(0, 5);
}

async function scrapeFinancialSource(source) {
  const res = await fetch(source.link, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || source.link.toLowerCase().endsWith('.pdf')) {
    return `${source.title}. ${source.snippet}`;
  }

  return stripHTML(await res.text()).slice(0, FINANCIAL_TEXT_LIMIT);
}

function extractStrategicObjectives(text, sources) {
  const sentences = String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 60 && sentence.length <= 320);

  const ranked = sentences
    .map((sentence) => {
      const lower = sentence.toLowerCase();
      const score = FINANCIAL_KEYWORDS.reduce(
        (total, keyword) => total + (lower.includes(keyword) ? 1 : 0),
        0
      );
      return { sentence, score };
    })
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .map(({ sentence }) => sentence);

  return uniqueBy(ranked, (sentence) => sentence.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 90))
    .slice(0, 3)
    .map((objective, index) => ({
      rank: index + 1,
      objective,
      source: sources[0]?.link || null
    }));
}

async function researchFinancialInsights(company) {
  try {
    const sources = await findFinancialSources(company);
    if (sources.length === 0) {
      return getFinancialFallback('not_found', 'No authoritative financial sources found');
    }

    const scraped = await Promise.allSettled(sources.map((source) => scrapeFinancialSource(source)));
    const documents = scraped
      .filter((result) => result.status === 'fulfilled' && result.value)
      .map((result) => result.value);

    if (documents.length === 0) {
      return getFinancialFallback('parse_failed', 'Financial sources could not be parsed');
    }

    const strategicObjectives = extractStrategicObjectives(documents.join(' '), sources);
    if (strategicObjectives.length === 0) {
      return getFinancialFallback('no_clear_priorities', 'No clear strategic objectives extracted');
    }

    return {
      financial_research_status: 'success',
      financial_research_error: null,
      financial_research_source: sources[0].link,
      financial_research_sources: sources,
      financial_research_summary: strategicObjectives.map((item) => `${item.rank}. ${item.objective}`).join('\n'),
      strategic_objectives: strategicObjectives
    };
  } catch (err) {
    return getFinancialFallback('error', err.message);
  }
}

/* ===========================
MAIN
=========================== */

async function enrichJobs(dateFolder) {
try {
if (!dateFolder) {
dateFolder = getDateFolderName();
}

const dataDir = path.join(__dirname, '..', 'data', dateFolder);
const inputPath = path.join(dataDir, 'all_job_details.json');
const outputPath = path.join(dataDir, 'enriched_job_details.json');
const cachePath = path.join(__dirname, '..', 'data', CACHE_FILENAME);

if (!fs.existsSync(inputPath)) {
  throw new Error("Input file not found: " + inputPath);
}

const jobs = readJsonArray(inputPath);
const cache = readCache(cachePath);

const results = [];

console.log("🚀 Jobs:", jobs.length);

for (let i = 0; i < jobs.length; i++) {
  const job = normalizeJob(jobs[i]);

  console.log("🔍", job.jobTitle || "Unknown");

  const company = job.companyName;

  if (!company) {
    results.push({
      ...job,
      company_status: 'invalid_company',
      company_website: null,
      company_details: null,
      ...getFinancialFallback('skipped', 'Missing company name'),
    });
    continue;
  }

  const key = normalizeCompanyName(company);
  const cached = cache[key];

  const companyPromise = cached
    ? Promise.resolve({
        company_status: cached.company_status,
        company_website: cached.company_website,
        company_details: cached.company_details,
        company_error: cached.company_error,
      })
    : fetchCompanyDirect(company);

  const financialPromise = cached?.financial_research_status
    ? Promise.resolve({
        financial_research_status: cached.financial_research_status,
        financial_research_error: cached.financial_research_error,
        financial_research_source: cached.financial_research_source,
        financial_research_sources: cached.financial_research_sources || [],
        financial_research_summary: cached.financial_research_summary,
        strategic_objectives: cached.strategic_objectives || [],
      })
    : researchFinancialInsights(company);

  if (cached) {
    console.log("⚡ Cache:", company);
  }

  const [companyResult, financialResult] = await Promise.allSettled([companyPromise, financialPromise]);
  const data = companyResult.status === 'fulfilled'
    ? companyResult.value
    : {
        company_status: 'error',
        company_website: null,
        company_details: null,
        company_error: companyResult.reason?.message || 'Company enrichment failed',
      };
  const financialData = financialResult.status === 'fulfilled'
    ? financialResult.value
    : getFinancialFallback('error', financialResult.reason?.message || 'Financial research failed');

  cache[key] = { ...data, ...financialData };
  saveCache(cachePath, cache);

  results.push({
    ...job,
    ...data,
    ...financialData,
  });

  await new Promise((resolve) => setTimeout(resolve, 500));
}

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log("✅ Done:", outputPath);


} catch (err) {
console.error("❌ Error:", err.message);
}
}

/* ===========================
RUN
=========================== */

if (require.main === module) {
const date = process.argv[2];
enrichJobs(date);
}

module.exports = { enrichJobs, researchFinancialInsights, extractStrategicObjectives };
