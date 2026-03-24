const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});
dotenv.config();

const SERPER_API_URL = 'https://google.serper.dev/search';
const SKIP_VALUE = 'motivation not needed';
const CACHE_FILENAME = 'company_cache.json';
const IGNORE_DOMAINS = new Set([
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'wikipedia.org',
  'glassdoor.com',
  'indeed.com',
]);
const COMPANY_SUFFIX_REGEX = /\b(inc\.?|ltd\.?|llc\.?|limited|corp\.?|corporation)\b/gi;

function getDateFolderName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeCompanyName(companyName) {
  return companyName
    .toLowerCase()
    .trim()
    .replace(COMPANY_SUFFIX_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeApiKey(apiKey) {
  if (typeof apiKey !== 'string') {
    return '';
  }

  const trimmed = apiKey.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function getCompanyName(job) {
  if (typeof job?.companyName === 'string' && job.companyName.trim() !== '') {
    return job.companyName;
  }

  if (typeof job?.company_name === 'string' && job.company_name.trim() !== '') {
    return job.company_name;
  }

  return '';
}

function shouldSkipJob(job) {
  if (job?.isEURegion !== 'yes') {
    return true;
  }

  return getCompanyName(job) === '';
}

function ensureSkipFields(job) {
  return {
    ...job,
    company_status: SKIP_VALUE,
    company_website: SKIP_VALUE,
    company_details: SKIP_VALUE,
  };
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    const brokenCopyPath = `${filePath}.invalid-${Date.now()}`;
    fs.copyFileSync(filePath, brokenCopyPath);
    console.warn(
      `⚠️ Invalid JSON in ${filePath}. Backed up to ${brokenCopyPath} and using fallback.`
    );
    return fallback;
  }
}

function readJsonArrayOrThrow(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.trim()) {
    throw new Error(`Input file is empty: ${filePath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in input file ${filePath}: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Input JSON must be an array of jobs.');
  }

  return parsed;
}

function isIgnoredDomain(hostname) {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');

  for (const ignoredDomain of IGNORE_DOMAINS) {
    if (normalized === ignoredDomain || normalized.endsWith(`.${ignoredDomain}`)) {
      return true;
    }
  }

  return false;
}

function getFirstValidOrganicUrl(searchResponse) {
  const organic = Array.isArray(searchResponse?.organic) ? searchResponse.organic : [];

  for (const result of organic) {
    const link = result?.link;

    if (!link || typeof link !== 'string') {
      continue;
    }

    try {
      const url = new URL(link);

      if (!isIgnoredDomain(url.hostname)) {
        return link;
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

function normalizeVisibleText(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

async function fetchCompanyInfoFromSerper(companyName, apiKey) {
  const searchPayload = {
    q: `${companyName} official website`,
    num: 5,
  };

  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const shortError = errorBody ? `: ${errorBody.slice(0, 300)}` : '';
    const keyHint =
      response.status === 403
        ? ' (check SERPER_API_KEY value, quota, and that the key is from serper.dev)'
        : '';
    throw new Error(`SERPER request failed with ${response.status}${shortError}${keyHint}`);
  }

  const searchData = await response.json();
  const websiteUrl = getFirstValidOrganicUrl(searchData);

  if (!websiteUrl) {
    return {
      company_status: 'not_found',
      company_website: null,
      company_details: null,
    };
  }

  const websiteResponse = await fetch(websiteUrl);

  if (!websiteResponse.ok) {
    throw new Error(`Website request failed with ${websiteResponse.status}`);
  }

  const html = await websiteResponse.text();
  const details = normalizeVisibleText(html);

  return {
    company_status: details ? 'success' : 'not_found',
    company_website: websiteUrl,
    company_details: details || null,
  };
}

async function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function appendDebugLog(logPath, message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

function resolveDataPaths(dateFolder) {
  const cwdDataDir = path.join(process.cwd(), 'data');
  const backendDataDir = path.join(__dirname, '..', 'data');
  const cwdDateDir = path.join(cwdDataDir, dateFolder);
  const backendDateDir = path.join(backendDataDir, dateFolder);

  if (fs.existsSync(path.join(cwdDateDir, 'all_job_details.json'))) {
    return {
      dataRootDir: cwdDataDir,
      dataDir: cwdDateDir,
    };
  }

  return {
    dataRootDir: backendDataDir,
    dataDir: backendDateDir,
  };
}

async function enrichJobs(dateFolder = getDateFolderName()) {
  const { dataRootDir, dataDir } = resolveDataPaths(dateFolder);
  const inputPath = path.join(dataDir, 'all_job_details.json');
  const outputPath = path.join(dataDir, 'enriched_job_details.json');
  const debugLogPath = path.join(dataDir, 'company_enrichment_debug.log');
  const cachePath = path.join(dataRootDir, CACHE_FILENAME);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const serperApiKey = normalizeApiKey(process.env.SERPER_API_KEY || process.env.SERPER_KEY || '');
  const jobs = readJsonArrayOrThrow(inputPath);

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const cache = readJsonIfExists(cachePath, {});
  const enrichedJobs = [];

  for (const [index, job] of jobs.entries()) {
    if (shouldSkipJob(job)) {
      enrichedJobs.push(ensureSkipFields(job));
      continue;
    }

    const rawCompanyName = getCompanyName(job);
    const normalizedCompany = normalizeCompanyName(rawCompanyName);

    if (!normalizedCompany) {
      enrichedJobs.push(ensureSkipFields(job));
      continue;
    }

    if (cache[normalizedCompany]) {
      enrichedJobs.push({
        ...job,
        ...cache[normalizedCompany],
        company_error:
          cache[normalizedCompany].company_status === 'error' ? 'cached_error_result' : null,
      });
      continue;
    }

    if (!serperApiKey) {
      const noKeyResult = {
        company_status: 'error',
        company_website: null,
        company_details: null,
      };

      enrichedJobs.push({
        ...job,
        ...noKeyResult,
        company_error: 'Missing SERPER_API_KEY or SERPER_KEY',
      });

      console.warn(`⚠️ Missing SERPER_API_KEY for job index ${index}.`);
      appendDebugLog(
        debugLogPath,
        `job_index=${index} company="${rawCompanyName}" status=error reason="missing_api_key"`
      );
      continue;
    }

    try {
      appendDebugLog(
        debugLogPath,
        `job_index=${index} company="${rawCompanyName}" normalized="${normalizedCompany}" action=serper_lookup`
      );
      const result = await fetchCompanyInfoFromSerper(rawCompanyName, serperApiKey);
      cache[normalizedCompany] = result;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

      enrichedJobs.push({
        ...job,
        ...result,
        company_error: null,
      });
    } catch (error) {
      const errorResult = {
        company_status: 'error',
        company_website: null,
        company_details: null,
      };

      enrichedJobs.push({
        ...job,
        ...errorResult,
        company_error: error.message,
      });

      console.warn(`⚠️ Failed company enrichment for "${rawCompanyName}": ${error.message}`);
      appendDebugLog(
        debugLogPath,
        `job_index=${index} company="${rawCompanyName}" status=error reason="${error.message.replace(/\n/g, ' ')}"`
      );
    }

    const delayMs = 1000 + Math.floor(Math.random() * 1001);
    await delay(delayMs);
  }

  fs.writeFileSync(outputPath, JSON.stringify(enrichedJobs, null, 2));
  console.log(`✅ Enriched ${enrichedJobs.length} jobs to ${outputPath}`);
  console.log(`🪵 Debug log written to ${debugLogPath}`);

  return outputPath;
}

module.exports = {
  enrichJobs,
  getDateFolderName,
  normalizeCompanyName,
};

if (require.main === module) {
  const dateFolder = process.argv[2] || getDateFolderName();

  enrichJobs(dateFolder).catch((error) => {
    console.error(`❌ Enrichment failed: ${error.message}`);
    process.exit(1);
  });
}
