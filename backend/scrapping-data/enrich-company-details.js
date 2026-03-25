const fs = require('fs');
const path = require('path');

/* ===========================
CONFIG
=========================== */

const CACHE_FILENAME = 'company_cache.json';

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
company_name: job.company_name || job.company_name || '',
};
}

function normalizeCompanyName(name) {
return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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

return html
.replace(/<[^>]*>/g, ' ')
.replace(/\s+/g, ' ')
.trim()
.slice(0, 2000);
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
MAIN
=========================== */

async function enrichJobs(dateFolder) {
try {
if (!dateFolder) {
dateFolder = getDateFolderName();
}

const dataDir = path.join(__dirname, '..', 'data', dateFolder);
const inputPath = path.join(dataDir, 'enriched_job_details.json');
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

  const company = job.company_name;

  if (!company) {
    results.push({
      ...job,
      company_status: 'invalid_company',
      company_website: null,
      company_details: null,
    });
    continue;
  }

  const key = normalizeCompanyName(company);

  if (cache[key]) {
    console.log("⚡ Cache:", company);
    results.push({ ...job, ...cache[key] });
    continue;
  }

  const data = await fetchCompanyDirect(company);

  cache[key] = data;
  saveCache(cachePath, cache);

  results.push({
    ...job,
    ...data,
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

module.exports = { enrichJobs };
