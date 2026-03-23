import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { transformCustomJobs, saveCustomJobs } from '../src/services/customJobService.mjs';

test('transformCustomJobs creates custom portal jobs from pasted blocks', () => {
  const content = `Frontend Developer\nGreat team and visa sponsorship available.\nhttps://example.com/job-1\n\nBackend Developer\nNo relocation support.\nhttps://example.com/job-2`;

  const jobs = transformCustomJobs(content);

  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].title, 'Frontend Developer');
  assert.equal(jobs[0].portal, 'custom');
  assert.equal(jobs[0].details.visaSponsorship, true);
  assert.equal(jobs[1].details.relocationSupport, false);
});

test('transformCustomJobs supports JSON entry arrays', () => {
  const jobs = transformCustomJobs([
    `Frontend Developer\nVisa sponsorship available\nhttps://example.com/job-1`,
    `Backend Developer\nNo relocation support\nhttps://example.com/job-2`
  ]);

  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].title, 'Frontend Developer');
  assert.equal(jobs[1].title, 'Backend Developer');
});

test('transformCustomJobs extracts title from long single-line content when available', () => {
  const jobs = transformCustomJobs([
    `Guardsquare • Hybrid-remote Leuven Scale-up 2y ago Front-End Engineer (React/TypeScript) Apply About the role Summary We are looking for an experienced Frontend Engineer with expertise in React and TypeScript https://meetfrank.com/jobs/guardsquare/frontend-engineer-reacttypescript`,
    `Apply\nFrontend Engineer | Senior | React | Network Department at NordLayer build and improve TypeScript React codebase\nhttps://jobs.lever.co/nordsec/6633b541-2742-4823-aa4d-57f833a26715/apply?lever-source=LinkedIn`
  ]);

  assert.equal(jobs.length, 2);
  assert.match(jobs[0].title, /Front-End Engineer/i);
  assert.match(jobs[1].title, /Frontend Engineer/i);
  assert.notEqual(jobs[1].title, 'Apply');
  assert.notEqual(jobs[1].details.description, jobs[1].title);
});

test('saveCustomJobs writes generated jobs json to target path', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'custom-job-test-'));
  const outputPath = path.join(tempDir, 'data', 'custom', 'custom.json');
  const jobs = [{ title: 'Test role', details: { title: 'Test role', description: 'desc', visaSponsorship: false, relocationSupport: false }, link: 'https://example.com', portal: 'custom' }];

  await saveCustomJobs(jobs, outputPath);

  const saved = await readFile(outputPath, 'utf8');
  const parsed = JSON.parse(saved);

  assert.deepEqual(parsed, jobs);
});
