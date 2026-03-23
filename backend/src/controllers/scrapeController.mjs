import { validateScrapeRequest } from '../models/scrapeRequestModel.mjs';
import { scrapeJobsByLinks } from '../services/jobScraperService.mjs';

export function createScrapeController(service = scrapeJobsByLinks) {
  return async function scrapeController(req, res) {
    const validation = validateScrapeRequest(req.body);

    if (!validation.isValid) {
      return res.status(validation.status).json({ error: validation.message });
    }

    const { jobLinks } = validation.data;

    try {
      const jobs = await service(jobLinks);

      return res.json({
        success: true,
        count: jobs.length,
        jobs
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}
