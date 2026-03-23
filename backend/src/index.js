const path = require('node:path');
const fs = require('fs-extra');
const dotenv = require('dotenv');

dotenv.config();

const { processJobs } = require('./processors/jobProcessor');
const { deduplicateJobs } = require('./utils/deduplicate');
const { writeJsonFile } = require('./utils/fileWriter');
const { writeExcelFile } = require('./utils/excelWriter');
const { getDateStamp } = require('./utils/timestamp');

function parseCliArgs(argv) {
  const [inputPath, startArg, endArg] = argv;

  if (!inputPath) {
    throw new Error('Usage: node src/index.js <input-json-path> [start] [end]');
  }

  const start = Number.isFinite(Number(startArg)) ? Number(startArg) : null;
  const end = Number.isFinite(Number(endArg)) ? Number(endArg) : null;

  return { inputPath, start, end };
}

function sliceJobs(jobs, start, end) {
  if (start === null && end === null) {
    return jobs;
  }

  if (start !== null && end !== null) {
    return jobs.slice(start, end);
  }

  if (start !== null) {
    return jobs.slice(start);
  }

  return jobs.slice(0, end);
}

async function run() {
  const { inputPath, start, end } = parseCliArgs(process.argv.slice(2));

  const absoluteInputPath = path.resolve(process.cwd(), inputPath);
  const rawJobs = await fs.readJson(absoluteInputPath);
  const jobsList = Array.isArray(rawJobs) ? rawJobs : [];

  const slicedJobs = sliceJobs(jobsList, start, end);
  const processedJobs = await processJobs(slicedJobs);
  const deduplicatedJobs = deduplicateJobs(processedJobs);

  const dateStamp = getDateStamp();
  const outputDir = path.resolve(process.cwd(), 'data', dateStamp);
  const jsonOutputPath = path.join(outputDir, 'all_job_details.json');
  const excelOutputPath = path.join(outputDir, 'all_job_details.xlsx');

  await writeJsonFile(jsonOutputPath, deduplicatedJobs);
  await writeExcelFile(excelOutputPath, deduplicatedJobs);

  console.log(`Processed ${slicedJobs.length} jobs.`);
  console.log(`Saved ${deduplicatedJobs.length} jobs to:`);
  console.log(`- ${jsonOutputPath}`);
  console.log(`- ${excelOutputPath}`);
}

run().catch((error) => {
  console.error('Pipeline failed:', error.message);
  process.exitCode = 1;
});
