import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface SyncCheckpoint {
  collection: string;
  row: number;
}

const checkpointPath = path.resolve(process.cwd(), '.sync-checkpoint.json');
const temporaryPath = `${checkpointPath}.tmp`;

export async function readSyncCheckpoint(): Promise<SyncCheckpoint | undefined> {
  try {
    const value = JSON.parse(await readFile(checkpointPath, 'utf8')) as {
      collection?: unknown;
      row?: unknown;
    };

    if (
      typeof value.collection !== 'string' ||
      typeof value.row !== 'number' ||
      !Number.isInteger(value.row) ||
      value.row < 0
    ) {
      throw new Error('Invalid sync checkpoint');
    }

    return {
      collection: value.collection,
      row: value.row,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

export async function writeSyncCheckpoint(
  checkpoint: SyncCheckpoint,
): Promise<void> {
  await writeFile(
    temporaryPath,
    `${JSON.stringify(checkpoint, null, 2)}\n`,
    'utf8',
  );
  await rename(temporaryPath, checkpointPath);
}

export async function clearSyncCheckpoint(): Promise<void> {
  await rm(checkpointPath, { force: true });
  await rm(temporaryPath, { force: true });
}
