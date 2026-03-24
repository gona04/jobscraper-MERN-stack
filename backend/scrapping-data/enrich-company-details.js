const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
path: path.join(__dirname, '..', '.env'),
override: true,
});
dotenv.config();

const SERPER_API_URL = 'https://google.serper.dev/search';
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

const COMPANY_SUFFIX_REGEX = /\b(inc.?|ltd.?|llc.?|limited|corp.?|corporation)\b/gi;

function getDateFolderName() {
const now = new Date();
return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/* ===========================
NORMALIZATION
=========================== */

function normalizeJob(job) {
return {
...job,
companyName: job.companyName || job.company_name || '',
isEURegion: job.isEURegion || 'no',
};
}

function normalizeCompanyName(name) {
return name
.toLowerCase()
.trim()
.replace(COMPANY_SUFFIX_REGEX, '')
.replace(/\s+/g, ' ')
.trim();
}

/* ===========================
SKIP LOGIC
=========================== */

function shouldSkipJob(job) {
if (job.isEURegion !== 'yes') {
console.log(`⏭️ Skipping (Non-EU): ${job.jobTitle}`);
return true;
}

if (!job.companyName) {
console.log(`⏭️ Skipping (No Company): ${job.jobTitle}`);
return true;
}

return false;
}

function ensureSkipFields(job) {
return {
...job,
company_status: null,
company_website: null,
company_details: null,
company_error: 'skipped',
};
}

/* ===========================
FILE HELPERS
=========================== */

function readJsonArray(filePath) {
const raw = fs.readFileSync(filePath, 'utf8');
return JSON.parse(raw);
}

function readCache(filePath) {
if (!fs.existsSync(filePath)) return {};
return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveCache(filePath, cache) {
fs.writeFileSync(filePath, JSON.stringify(cache, null, 2));
}

/* ===========================
URL HELPERS
=========================== */

function isIgnoredDomain(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;

  const clean = hostname
    .replace(/^https?:\/\//, '') // remove http/https if present
    .replace(/^www\./, '')      // remove www.
    .toLowerCase();

  return [...IGNORE_DOMAINS].some(
    (d) => clean === d || clean.endsWith(`.${d}`)
  );
}

function getFirstValidUrl(results) {
for (const r of results || []) {
const link = r?.link;
if (!link) continue;

```
try {
  const url = new URL(link);
  if (!isIgnoredDomain(url.hostname)) return link;
} catch {}
```

}
return null;
}

/* ===========================
SCRAPING
=========================== */

function cleanHTML(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

async function scrapeWebsite(url) {
const res = await fetch(url);
const html = await res.text();

return {
company_status: 'success',
company_website: url,
company_details: cleanHTML(html),
};
}

/* ===========================
SERPER
=========================== */

async function fetchFromSerper(company, apiKey) {
console.log(`🌐 SERPER: ${company}`);

const res = await fetch(SERPER_API_URL, {
method: 'POST',
headers: {
'X-API-KEY': apiKey,
'Content-Type': 'application/json',
},
body: JSON.stringify({
q: `${company} official website`,
num: 5,
}),
});

if (!res.ok) {
throw new Error(`SERPER failed: ${res.status}`);
}

const data = await res.json();
const url = getFirstValidUrl(data.organic);

if (!url) {
return {
company_status: 'not_found',
company_website: null,
company_details: null,
};
}

return scrapeWebsite(url);
}

/* ===========================
MAIN
=========================== */

async function enrichJobs(dateFolder = getDateFolderName()) {
  const dataDir = path.join(__dirname, '..', 'data', dateFolder);
  const inputPath = path.join(dataDir, 'all_job_details.json');
  const outputPath = path.join(dataDir, 'enriched_job_details.json');
  const cachePath = path.join(__dirname, '..', 'data', CACHE_FILENAME);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('❌ SERPER_API_KEY is missing in .env');
  }

  let jobs;
  try {
    jobs = readJsonArray(inputPath);
  } catch (err) {
    throw new Error(`❌ Failed to read input JSON: ${err.message}`);
  }

  const cache = readCache(cachePath);
  const results = [];

  console.log(`\n🚀 Starting enrichment for ${jobs.length} jobs...\n`);

  for (let i = 0; i < jobs.length; i++) {
    try {
      const rawJob = jobs[i];
      const job = normalizeJob(rawJob);

      console.log(`\n🔍 [${i + 1}/${jobs.length}] ${job.jobTitle || 'Unknown Role'}`);

      if (shouldSkipJob(job)) {
        results.push(ensureSkipFields(job));
        continue;
      }

      const rawCompany = job.companyName;

      if (!rawCompany || typeof rawCompany !== 'string') {
        console.log(`⚠️ Invalid company name, skipping`);
        results.push(ensureSkipFields(job));
        continue;
      }

      const normalized = normalizeCompanyName(rawCompany);

      if (!normalized) {
        console.log(`⚠️ Normalized company empty, skipping`);
        results.push(ensureSkipFields(job));
        continue;
      }

      /* ===========================
         CACHE HIT
      =========================== */
      if (cache[normalized]) {
        console.log(`⚡ Cache hit: ${normalized}`);
        results.push({ ...job, ...cache[normalized] });
        continue;
      }

      /* ===========================
         API FETCH (WITH RETRY)
      =========================== */
      let data = null;
      let attempts = 0;
      const MAX_RETRIES = 2;

      while (attempts <= MAX_RETRIES) {
        try {
          console.log(`🌐 Fetching (${attempts + 1}) → ${rawCompany}`);
          data = await fetchFromSerper(rawCompany, apiKey);
          break;
        } catch (err) {
          attempts++;
          console.log(`⚠️ Attempt ${attempts} failed: ${err.message}`);

          if (attempts > MAX_RETRIES) {
            throw err;
          }

          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      /* ===========================
         SAVE RESULT
      =========================== */
      cache[normalized] = data;
      saveCache(cachePath, cache);

      results.push({
        ...job,
        ...data,
      });

      console.log(`✅ Success: ${rawCompany}`);

    } catch (err) {
      console.log(`❌ Job failed: ${err.message}`);

      results.push({
        ...jobs[i],
        company_status: 'error',
        company_website: null,
        company_details: null,
        company_error: err.message,
      });
    }

    /* ===========================
       RATE LIMIT
    =========================== */
    await new Promise((r) => setTimeout(r, 1000));
  }

  /* ===========================
     SAVE OUTPUT
  =========================== */
  try {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n🎉 Enrichment complete → ${outputPath}`);
  } catch (err) {
    throw new Error(`❌ Failed to write output: ${err.message}`);
  }
}


if (require.main === module) {
const date = process.argv[2] || getDateFolderName();

enrichJobs(date).catch((e) => {
console.error(`❌ Failed: ${e.message}`);
process.exit(1);
});
}

module.exports = { enrichJobs };
