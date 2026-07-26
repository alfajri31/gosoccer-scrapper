import 'dotenv/config';

import app from './app';
import { connectDatabase } from './db/db';
import { getOrStartWikipediaMasterSync } from './services/wikipedia-master.service';

const port = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  await connectDatabase();
  getOrStartWikipediaMasterSync();

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
