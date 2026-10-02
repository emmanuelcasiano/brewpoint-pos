import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { hashSecret } from '../src/core/auth/password';
import { createPlatformDb } from '../src/core/db/client';
import { SUPERADMIN_ROLE_ID } from '../src/db/seed/reference';

// Makes a Superadmin staff account, for the first sign-in to the staff console in a new
// environment. It prints a generated password once; two-step is set up on the first sign-in.
// Usage: pnpm staff:create --email maria@brewpoint.ph --name "Maria Santos"

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' } },
});

const email = z.email().safeParse(values.email?.trim().toLowerCase());
const name = values.name?.trim();
if (!email.success || !name) {
  console.error(
    'Give the new staff member\'s email and name: pnpm staff:create --email maria@brewpoint.ph --name "Maria Santos"',
  );
  process.exit(1);
}

const url = process.env.PLATFORM_DATABASE_URL;
if (!url) {
  console.error(
    'PLATFORM_DATABASE_URL is not set. Run pnpm db:roles and add the line it prints to .env.',
  );
  process.exit(1);
}

const db = createPlatformDb(url);

try {
  const existing = await db
    .selectFrom('platform_users')
    .select('id')
    .where('email', '=', email.data)
    .executeTakeFirst();
  if (existing) {
    console.error(`${email.data} already has a staff account. Nothing was changed.`);
    process.exitCode = 1;
  } else {
    const password = randomBytes(18).toString('base64url');
    await db
      .insertInto('platform_users')
      .values({
        name,
        email: email.data,
        password_hash: await hashSecret(password),
        role_id: SUPERADMIN_ROLE_ID,
        status: 'active',
      })
      .execute();
    console.log(`Made ${name} (${email.data}) a Superadmin. Their password, shown only once:\n`);
    console.log(`  ${password}\n`);
    console.log('Send it to them privately. They set up two-step sign-in when they first sign in.');
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(
    `Could not make the staff account: ${reason}. Run pnpm db:migrate and pnpm db:seed first if tables or the Superadmin role are missing.`,
  );
  process.exitCode = 1;
} finally {
  await db.destroy();
}
