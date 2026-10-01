import { createMigrationDb } from '../src/db/migrator';
import { seedDemo } from '../src/db/seed/demo';
import { seedReference } from '../src/db/seed/reference';

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error(
    "MIGRATION_DATABASE_URL is not set. Add the owner's direct connection string (no -pooler) to .env.",
  );
  process.exit(1);
}

const appEnv = process.env.APP_ENV ?? 'local';
const withDemo = appEnv === 'local' || process.argv.includes('--demo');

const db = createMigrationDb(url);

try {
  await seedReference(db);
  console.log('Seeded the permission list and the three plans.');
  if (withDemo) {
    await seedDemo(db);
    console.log('Seeded the demo shops Kape Davao and Brew Bros Cebu.');
  } else {
    console.log(`Skipped the demo shops: APP_ENV is ${appEnv}. Pass --demo to add them anyway.`);
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(
    `Could not seed the database: ${reason}. Run pnpm db:migrate first if tables are missing.`,
  );
  process.exitCode = 1;
} finally {
  await db.destroy();
}
