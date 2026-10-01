import { createMigrationDb, createMigrator } from '../src/db/migrator';

const goingDown = process.argv[2] === 'down';

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error(
    "MIGRATION_DATABASE_URL is not set. Add the owner's direct connection string (no -pooler) to .env.",
  );
  process.exit(1);
}

const db = createMigrationDb(url);
const migrator = createMigrator(db);

try {
  const { error, results = [] } = goingDown
    ? await migrator.migrateDown()
    : await migrator.migrateToLatest();

  for (const result of results) {
    if (result.status === 'Success') {
      console.log(
        `${result.direction === 'Up' ? 'Applied' : 'Rolled back'} ${result.migrationName}`,
      );
    } else if (result.status === 'Error') {
      console.error(`Failed on ${result.migrationName}`);
    }
  }

  if (error) {
    const reason = error instanceof Error ? error.message : JSON.stringify(error);
    // Kysely runs all pending migrations in one transaction on PostgreSQL.
    console.error(`Migration stopped and nothing was changed: ${reason}`);
    process.exitCode = 1;
  } else if (results.length === 0) {
    console.log(
      goingDown
        ? 'Nothing to roll back: no migrations have run.'
        : 'The database is already up to date.',
    );
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(
    `Could not run migrations: ${reason}. If it says brewpoint_migrator does not exist, run pnpm db:roles first.`,
  );
  process.exitCode = 1;
} finally {
  await db.destroy();
}
