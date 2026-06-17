import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { writeExcelFile, toCountryName } = require('../src/utils/excelWriter.js');

test('toCountryName reads the LLM country_name field', () => {
  assert.equal(toCountryName({ country_name: 'Germany' }), 'Germany');
});

test('toCountryName falls back to LinkedIn country subdomain', () => {
  assert.equal(
    toCountryName({ job_link: 'https://pt.linkedin.com/jobs/view/senior-frontend-engineer' }),
    'Portugal'
  );
});

test('writeExcelFile populates Country Name from country_name', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'jobs-excel-'));
  const outputPath = path.join(tempDir, 'jobs.xlsx');

  try {
    await writeExcelFile(outputPath, [
      {
        country_name: 'Ireland',
        company_name: 'Example Co',
        jobTitle: 'Frontend Engineer',
        job_link: 'https://ie.linkedin.com/jobs/view/frontend-engineer'
      }
    ]);

    await readFile(outputPath);
    const workbook = XLSX.readFile(outputPath);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Jobs);

    assert.equal(rows[0]['Country Name'], 'Ireland');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
