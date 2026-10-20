import { Router } from 'express';

import { extractJobsFromEntries } from '../services/jobExtractionService.js';
import { sortByVisaSponsorship } from '../utils/sortJobs.js';
import { resolveDataDir, saveJobOutputs } from '../utils/jobOutput.js';

function createJobsRouter({ baseDir }) {
  const router = Router();

  router.post('/jobs', async (req, res) => {
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

      const allJobs = await extractJobsFromEntries(raw);

      if (!allJobs.length) {
        return res.status(422).json({ error: 'No jobs could be extracted from provided entries' });
      }

      const sortedJobs = sortByVisaSponsorship(allJobs);

      const dataDir = resolveDataDir(baseDir);
      const { jsonOutputPath, excelOutputPath } = await saveJobOutputs(dataDir, sortedJobs);

      return res.json({
        success: true,
        count: sortedJobs.length,
        savedPath: jsonOutputPath,
        excelPath: excelOutputPath,
        jobs: sortedJobs
      });
    } catch (err) {
      console.error('❌ Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

export { createJobsRouter };
