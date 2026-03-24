const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

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
return (name || '').toLowerCase().trim();
}

/* ===========================
FILE HELPERS
=========================== */

function readJsonArray(filePath) {
try {
const raw = fs.readFileSync(filePath, 'utf8');
return JSON.parse(raw);
} catch (err) {
console.log('❌ Failed to read JSON:', err.message);
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
console.log('⚠️ Failed to save cache:', err.message);
}
}

/* ===========================
DOMAIN FILTER
=========================== */

// function isIgnoredDomain(hostname) {
//   if (!hostname || typeof hostname !== 'string') return false;

//   try {
//     const clean = hostname.replace(/^www\./, '').toLowerCase();

//     for (const domain of IGNORE_DOMAINS) {
//       if (clean === domain || clean.endsWith('.' + domain)) {
//         return true;
//       }
//     }

//     return false;
//   } catch (err) {
//     return false;
//   }
// }

/* ===========================
HTML CLEANING (SAFE VERSION)
=========================== */

function cleanHTML(html) {
if (!html || typeof html !== 'string') return '';

return html
.replace(/<[^>]*>/g, ' ')   // remove ALL tags (safe)
.replace(/\s+/g, ' ')
.trim()
.slice(0, 3000);
}

/* ===========================
SCRAPE WEBSITE
=========================== */

async function scrapeWebsite(url) {
try {
const res = await fetch(url, {
headers: { 'User-Agent': 'Mozilla/5.0' },
});

```
const html = await res.text();

return {
  company_status: 'success',
  company_website: url,
  company_details: cleanHTML(html),
};
```

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
Fetch data from company directly 
=========================== */
async function fetchCompanyDirect(company) {
  try {
    const safeCompany = company
      .split('/')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const url = `https://www.${safeCompany}.com`;

    console.log("🌐 Trying:", url);

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      throw new Error("Site not reachable");
    }

    const html = await res.text();

    return {
      company_status: 'success',
      company_website: url,
      company_details: cleanHTML(html),
    };

  } catch (err) {
    return {
      company_status: 'not_found',
      company_website: null,
      company_details: null,
    };
  }
}

/* ===========================
MAIN PIPELINE
=========================== */

async function enrichJobs(dateFolder) {
  try {
    // fallback if not passed
    if (!dateFolder) {
      const now = new Date();
      dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
    }

    const dataDir = path.join(__dirname, '..', 'data', dateFolder);
    const inputPath = path.join(dataDir, 'all_job_details.json');
    const outputPath = path.join(dataDir, 'enriched_job_details.json');
    const cachePath = path.join(__dirname, '..', 'data', 'company_cache.json');

    if (!fs.existsSync(inputPath)) {
      throw new Error("Input file not found: " + inputPath);
    }

    let jobs = [];
    try {
      const raw = fs.readFileSync(inputPath, 'utf8');
      jobs = JSON.parse(raw);
    } catch (e) {
      throw new Error("Invalid JSON file");
    }

    if (!Array.isArray(jobs)) {
      throw new Error("Jobs data is not an array");
    }

    let cache = {};
    try {
      if (fs.existsSync(cachePath)) {
        cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      }
    } catch {
      cache = {};
    }

    const results = [];

    console.log("🚀 Starting enrichment:", jobs.length, "jobs");

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      console.log("🔍 Processing:", job.jobTitle || "Unknown");

      const company = job.companyName || job.company_name;

      if (!company) {
        results.push({
          ...job,
          company_status: 'invalid_company',
          company_website: null,
          company_details: null,
        });
        continue;
      }

      const key = company.toLowerCase().trim();

      // cache check
      if (cache[key]) {
        console.log("⚡ Cache hit:", company);
        results.push({ ...job, ...cache[key] });
        continue;
      }

      let data;

      try {
        data = await fetchCompanyDirect(company);
      } catch (err) {
        data = {
          company_status: 'error',
          company_website: null,
          company_details: null,
          company_error: err.message,
        };
      }

      cache[key] = data;

      try {
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      } catch {}

      results.push({
        ...job,
        ...data,
      });

      // small delay
      await new Promise(function (resolve) {
        setTimeout(resolve, 500);
      });
    }

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log("✅ Done:", outputPath);

  } catch (err) {
    console.error("❌ Fatal error:", err.message);
  }
}

/* ===========================
RUN
=========================== */

if (require.main === module) {
const date = process.argv[2] || getDateFolderName();

enrichJobs(date);
}

module.exports = { enrichJobs };
