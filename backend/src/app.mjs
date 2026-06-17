import express from 'express';
import scrapeRoutes from './routes/scrapeRoutes.mjs';
import { createCustomJobController } from './controllers/customJobController.mjs';

export function createApp({ customJobController = createCustomJobController() } = {}) {
  const app = express();

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('Server is running');
  });

  app.post('/jobs', customJobController);
  app.use('/api', scrapeRoutes);

  return app;
}
