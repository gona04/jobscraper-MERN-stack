import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerProcessErrorHandlers } from './src/config/errorHandlers.mjs';
import { createJobsRouter } from './src/features/classifying-data/routes/jobsRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

registerProcessErrorHandlers();
app.use(express.json({limit: '50mb'}));

app.get('/', (_req, res) => {
  res.send('Server is running');
});

app.use(createJobsRouter({ baseDir: __dirname }));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
