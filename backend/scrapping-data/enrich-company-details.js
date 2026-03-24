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

if (require.main === module) {
const date = process.argv[2] || getDateFolderName();

enrichJobs(date);
}

module.exports = { enrichJobs };
