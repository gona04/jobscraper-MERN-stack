import express from 'express';
import scrapeRoutes from './routes/scrapeRoutes.mjs';

const endpoints = [
  {
    method: 'GET',
    path: '/',
    description: 'Backend health check.'
  },
  {
    method: 'POST',
    path: '/api/scrape',
    description: 'Scrape jobs from supported job links. Send JSON with a job_links array.'
  },
  {
    method: 'POST',
    path: '/api/custom/jobs',
    description: 'Transform pasted job descriptions into the app job format.'
  }
];

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('Server is running');
  });

  app.get('/jobs', (_req, res) => {
    res.json({
      message: 'The backend does not serve a /jobs page. Use the API routes below, or run the frontend app for browser pages.',
      endpoints
    });
  });

  app.use('/api', scrapeRoutes);

  return app;
}
