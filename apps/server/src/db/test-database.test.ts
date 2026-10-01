import { describe, expect, it } from 'vitest';
import { checkTestDatabaseUrls } from './test-database';

const DEV_POOLED =
  'postgresql://brewpoint_app:a@ep-dev-1-pooler.c-7.us-east-2.aws.neon.tech/neondb';
const DEV_DIRECT = 'postgresql://neondb_owner:b@ep-dev-1.c-7.us-east-2.aws.neon.tech/neondb';
const TEST_POOLED =
  'postgresql://brewpoint_app:c@ep-test-2-pooler.c-7.us-east-2.aws.neon.tech/neondb';
const TEST_DIRECT = 'postgresql://neondb_owner:d@ep-test-2.c-7.us-east-2.aws.neon.tech/neondb';

describe('checkTestDatabaseUrls', () => {
  it('accepts a test branch that is separate from the development branch', () => {
    const check = checkTestDatabaseUrls({
      DATABASE_URL: DEV_POOLED,
      MIGRATION_DATABASE_URL: DEV_DIRECT,
      TEST_DATABASE_URL: TEST_POOLED,
      MIGRATION_TEST_DATABASE_URL: TEST_DIRECT,
    });

    expect(check).toEqual({ ok: true, urls: { owner: TEST_DIRECT, app: TEST_POOLED } });
  });

  it('skips when a test URL is missing', () => {
    const check = checkTestDatabaseUrls({ TEST_DATABASE_URL: TEST_POOLED });

    expect(check).toMatchObject({ ok: false, reason: 'missing' });
  });

  it('refuses a test URL that points at the development branch, pooled or direct', () => {
    const pooled = checkTestDatabaseUrls({
      MIGRATION_DATABASE_URL: DEV_DIRECT,
      TEST_DATABASE_URL: DEV_POOLED,
      MIGRATION_TEST_DATABASE_URL: TEST_DIRECT,
    });
    const direct = checkTestDatabaseUrls({
      DATABASE_URL: DEV_POOLED,
      TEST_DATABASE_URL: TEST_POOLED,
      MIGRATION_TEST_DATABASE_URL: DEV_DIRECT,
    });

    expect(pooled).toMatchObject({ ok: false, reason: 'unsafe' });
    expect(direct).toMatchObject({ ok: false, reason: 'unsafe' });
  });

  it('refuses test URLs that point at two different databases', () => {
    const check = checkTestDatabaseUrls({
      TEST_DATABASE_URL: TEST_POOLED,
      MIGRATION_TEST_DATABASE_URL: DEV_DIRECT,
    });

    expect(check).toMatchObject({ ok: false, reason: 'unsafe' });
  });

  it('refuses a URL that is not a connection string', () => {
    const check = checkTestDatabaseUrls({
      TEST_DATABASE_URL: 'my test database',
      MIGRATION_TEST_DATABASE_URL: TEST_DIRECT,
    });

    expect(check).toMatchObject({ ok: false, reason: 'unsafe' });
  });
});
