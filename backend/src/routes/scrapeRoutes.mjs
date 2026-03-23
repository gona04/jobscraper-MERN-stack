import { Router } from 'express';
import { createScrapeController } from '../controllers/scrapeController.mjs';

const router = Router();

router.get('/scrape', createScrapeController());

export default router;
