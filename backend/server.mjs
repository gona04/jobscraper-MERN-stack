import express from 'express';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { registerProcessErrorHandlers } from './src/config/errorHandlers.mjs';

const require = createRequire(import.meta.url);
const { generateJobDetails } = require('./src/services/llmService.js');
const { writeExcelFile } = require('./src/utils/excelWriter.js'); // ← adjust path if different

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

registerProcessErrorHandlers();
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Server is running');
});

app.post('/jobs', async (req, res) => {
  try {
    const body = req.body;

    const raw = Array.isArray(body)
      ? body
      : Array.isArray(body?.entries)
        ? body.entries
        : null;

    if (!raw || !raw.length) {
      return res.status(400).json({ error: 'Send { entries: [...] } or a plain array' });
    }

    console.log(`📥 Received ${raw.length} entries — extracting with GPT...`);

    const allJobs = [];

    for (const [i, item] of raw.entries()) {
      try {
        const content = typeof item === 'string' ? item : item?.content;
        const overrideCompanyName = item?.company_name || null;

        if (!content) {
          console.log(`⚠️  Job ${i + 1} skipped — no content`);
          continue;
        }

        console.log(`🔍 Extracting job ${i + 1}/${raw.length}...`);

        const gptRaw = await generateJobDetails(content);
        console.log(`🤖 GPT raw response:`, gptRaw);

        const clean = gptRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((job) => ({
            company_name: overrideCompanyName || job.company_name || '',
            jobTitle: job.jobTitle || '',
            job_link: job.job_link || '',
            country_name: job.country_name || '',
            location: '',
            isEURegion: job.isEURegion || 'no',
            visa_sponsorship: job.visa_sponsorship || 'Unknown',
            only_english: job.only_english ?? null,
            skillsRequired: job.skillsRequired || [],
            rolesAndResponsibilities: job.rolesAndResponsibilities || '',
            jobDescription: job.rolesAndResponsibilities || ''
          }));
          allJobs.push(...mapped);
          console.log(`✅ Job ${i + 1} extracted: ${mapped[0]?.company_name} — ${mapped[0]?.jobTitle}`);
        } else {
          console.log(`⚠️  Job ${i + 1} skipped — GPT returned empty`);
        }
      } catch (err) {
        console.error(`❌ GPT extraction failed for job ${i + 1}:`, err.message);
      }
    }

    if (!allJobs.length) {
      return res.status(422).json({ error: 'No jobs could be extracted from provided entries' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const dataDir = path.resolve(__dirname, `data/${today}`);
    const jsonOutputPath = path.resolve(dataDir, 'enriched_job_details.json');
    const excelOutputPath = path.resolve(dataDir, 'jobs.xlsx');

    // ── Save JSON ──
    await mkdir(dataDir, { recursive: true });
    await writeFile(jsonOutputPath, JSON.stringify(allJobs, null, 2));
    console.log(`✅ Saved JSON → ${jsonOutputPath}`);

    // ── Save Excel immediately after ──
    await writeExcelFile(excelOutputPath, allJobs);
    console.log(`✅ Saved Excel → ${excelOutputPath}`);

    return res.json({
      success: true,
      count: allJobs.length,
      savedPath: jsonOutputPath,
      excelPath: excelOutputPath,
      jobs: allJobs
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
