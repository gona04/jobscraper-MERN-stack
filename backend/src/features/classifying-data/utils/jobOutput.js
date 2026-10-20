import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { writeExcelFile } = require('../../../utils/excelWriter'); // ← adjust path if different

/** Resolves the per-day output directory (data/<YYYY-MM-DD>) relative to a base dir. */
function resolveDataDir(baseDir, date = new Date().toISOString().slice(0, 10)) {
  return path.resolve(baseDir, `data/${date}`);
}

/**
 * Writes the (already-sorted) job list to disk as both JSON and Excel.
 * Returns the paths written to.
 */
async function saveJobOutputs(dataDir, jobs) {
  const jsonOutputPath = path.resolve(dataDir, 'enriched_job_details.json');
  const excelOutputPath = path.resolve(dataDir, 'jobs.xlsx');

  await mkdir(dataDir, { recursive: true });

  await writeFile(jsonOutputPath, JSON.stringify(jobs, null, 2));
  console.log(`✅ Saved JSON → ${jsonOutputPath}`);

  await writeExcelFile(excelOutputPath, jobs);
  console.log(`✅ Saved Excel → ${excelOutputPath}`);

  return { jsonOutputPath, excelOutputPath };
}

export { resolveDataDir, saveJobOutputs };
