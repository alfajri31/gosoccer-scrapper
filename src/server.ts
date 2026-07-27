import 'dotenv/config';

import app from './app';
import { connectDatabase } from './db/db';
import { getOrStartWikipediaMasterSync } from './services/wikipedia-master.service';

const port = Number(process.env.PORT) || 3000;

function readSyncTarget(): string | undefined {
  const args = process.argv.slice(2);
  const syncArgument = args.find((argument) => argument.startsWith('--sync='));

  if (syncArgument) {
    return syncArgument.slice('--sync='.length);
  }

  const syncIndex = args.indexOf('--sync');

  if (syncIndex >= 0) {
    const target = args[syncIndex + 1];

    if (!target || target.startsWith('--')) {
      throw new Error('The --sync flag requires a document name');
    }

    return target;
  }

  const shorthand = args.find(
    (argument) =>
      argument.startsWith('--') &&
      argument !== '--' &&
      argument !== '--sync',
  );

  return shorthand?.slice(2);
}

async function startServer(): Promise<void> {
  await connectDatabase();
  getOrStartWikipediaMasterSync(readSyncTarget());

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
