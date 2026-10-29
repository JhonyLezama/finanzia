import 'fake-indexeddb/auto';

export { ConflictError, db, resetDb } from './db';

export async function withFreshDb<T>(run: () => Promise<T>): Promise<T> {
  const { resetDb } = await import('./db');
  await resetDb();
  try {
    return await run();
  } finally {
    await resetDb();
  }
}
