const path = require('node:path');

const today = () => new Date().toISOString().slice(0, 10);

const TODAY = today();

const INPUT_FILE = path.resolve(__dirname, `../../../../../data/${TODAY}/enriched_job_details.json`);
const CACHE_FILE = path.resolve(__dirname, '../../../../../data/company_cache.json');

function resultsOutputFile(date = today()) {
  return path.resolve(__dirname, `../../../../../data/results_${date}.json`);
}

module.exports = {
  TODAY,
  INPUT_FILE,
  CACHE_FILE,
  resultsOutputFile
};
