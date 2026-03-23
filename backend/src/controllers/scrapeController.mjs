import { validateScrapeRequest } from '../models/scrapeRequestModel.mjs';
import { scrapeJobsByPortal } from '../services/jobScraperService.mjs';

export function createScrapeController(service = scrapeJobsByPortal) {
  return async function scrapeController(req, res) {
    const validation = validateScrapeRequest(req.query);

    if (!validation.isValid) {
      return res.status(validation.status).json({ error: validation.message });
    }

    const { portal, url } = validation.data;

    try {
      const jobs = await service(portal, url);

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
