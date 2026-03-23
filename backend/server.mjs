import { createApp } from './src/app.mjs';
import { registerProcessErrorHandlers } from './src/config/errorHandlers.mjs';

const port = process.env.PORT || 3001;

registerProcessErrorHandlers();

const app = createApp();

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
