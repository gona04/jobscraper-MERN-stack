import express from 'express';
import { registerProcessErrorHandlers } from './src/config/errorHandlers.mjs';

const app = express();
const PORT = 3001;

registerProcessErrorHandlers();

app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Server is running');
});

app.post('/jobs', async (req, res) => {
  try {
    const jobs = req.body;

    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({ error: 'Invalid jobs input' });
    }

    console.log('📥 Received jobs:', jobs.length);

    // TODO: trigger pipeline here
    // await runPipeline(jobs);

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
