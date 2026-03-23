import express from 'express';
import scrapeRoutes from './routes/scrapeRoutes.mjs';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('Server is running');
  });

  app.use('/api', scrapeRoutes);

  return app;
}
