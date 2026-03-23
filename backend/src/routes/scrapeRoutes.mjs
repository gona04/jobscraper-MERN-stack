import { Router } from 'express';
import { createScrapeController } from '../controllers/scrapeController.mjs';
import { createCustomJobController } from '../controllers/customJobController.mjs';

const router = Router();

router.post('/scrape', createScrapeController());
router.post('/custom/jobs', createCustomJobController());

export default router;
