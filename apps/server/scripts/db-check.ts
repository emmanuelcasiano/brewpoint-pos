import pg from 'pg';

const REQUIRED_MAJOR = 18;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    'DATABASE_URL is not set. Copy .env.example to .env and paste your Neon connection string.',
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  const result = await client.query<{ server_version: string }>('SHOW server_version');
  const version = result.rows[0]?.server_version ?? 'unknown';
  const major = Number.parseInt(version, 10);
  const host = new URL(url).hostname;

  if (major !== REQUIRED_MAJOR) {
    console.error(
      `Connected to ${host}, but it runs PostgreSQL ${version}. BrewPoint needs PostgreSQL ${REQUIRED_MAJOR}; create the Neon project with version ${REQUIRED_MAJOR}.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Connected to PostgreSQL ${version} at ${host}.`);
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Could not connect to the database: ${reason}. Check DATABASE_URL in .env.`);
  process.exitCode = 1;
} finally {
  await client.end();
}
