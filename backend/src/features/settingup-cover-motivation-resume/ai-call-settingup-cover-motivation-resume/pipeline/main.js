require('dotenv').config();

const fs = require('node:fs').promises;

const { INPUT_FILE, resultsOutputFile } = require('../config/paths');
const { log } = require('../utils/log');
const { loadCache } = require('../cache/companyCache');
const { resolveProviderConfig } = require('../providers/resolveConfig');
const { processJob } = require('./processJob');

async function main() {
  const outputFile = resultsOutputFile();

  const [rawJobs, cache] = await Promise.all([
    fs.readFile(INPUT_FILE, 'utf8').then(JSON.parse),
    loadCache()
  ]);

  const providerConfig = resolveProviderConfig();
  log(`Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`);

  const results = [];
  console.log(rawJobs.length);
  for (let i = 0; i < 1; i++) {
    const job = rawJobs[i];
    log(`[${i + 1}/${rawJobs.length}] Processing → ${job.company_name ?? 'unknown'}`);

    try {
      const processed = await processJob(job, cache, providerConfig);
      results.push(processed);
    } catch (err) {
      log(`Error processing ${job.company_name ?? 'unknown'}: ${err.message}`);
      results.push({
        summary: '',
        company_name: job.company_name ?? '',
        job_title: job.jobTitle ?? '',
        cover_letter: {},
        resume: {},
        job_link: job.jobLink ?? '',
        company_website: null,
        company_status: 'error',
        error: err.message
      });
    }
  }

  await fs.writeFile(outputFile, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  log(`Saved ${results.length} results → ${outputFile}`);
}

if (require.main === module) {
  main().catch((err) => {
    log(`Fatal pipeline error: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
