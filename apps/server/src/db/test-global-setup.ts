import { checkTestDatabaseUrls, prepareTestDatabase } from './test-database';

/** Runs once before the server's tests: rebuilds the test database from empty. */
export default async function setup(): Promise<void> {
  const check = checkTestDatabaseUrls(process.env);
  if (check.ok) {
    await prepareTestDatabase(check.urls);
    return;
  }
  if (check.reason === 'unsafe' || process.env.CI) {
    throw new Error(check.message);
  }
  console.warn(`Skipping the database tests. ${check.message}`);
}
