import { createOwnerDb } from '../src/db/migrator';
import {
  APP_ROLE,
  bootstrapRoles,
  type LoginRole,
  newRolePassword,
  PLATFORM_ROLE,
  roleCanLogin,
  setRolePassword,
} from '../src/db/roles';

const args = process.argv.slice(2);
const forTest = args.includes('--test');
const sourceVar = forTest ? 'MIGRATION_TEST_DATABASE_URL' : 'MIGRATION_DATABASE_URL';

// The server logs in as the app role for shops and as the platform role for the staff console.
// Tests derive the platform login from TEST_DATABASE_URL, so --test sets only the app role.
const LOGINS: readonly { role: LoginRole; targetVar: string }[] = forTest
  ? [{ role: APP_ROLE, targetVar: 'TEST_DATABASE_URL' }]
  : [
      { role: APP_ROLE, targetVar: 'DATABASE_URL' },
      { role: PLATFORM_ROLE, targetVar: 'PLATFORM_DATABASE_URL' },
    ];

const ownerUrl = process.env[sourceVar];
if (!ownerUrl) {
  console.error(
    `${sourceVar} is not set. Add the owner's direct connection string (no -pooler) to .env.`,
  );
  process.exit(1);
}

const db = createOwnerDb(ownerUrl);

try {
  await bootstrapRoles(db);
  console.log('Roles brewpoint_migrator, brewpoint_app and brewpoint_platform are ready.');

  for (const { role, targetVar } of LOGINS) {
    if (args.includes('--new-password') || !(await roleCanLogin(db, role))) {
      const password = newRolePassword();
      await setRolePassword(db, role, password);
      console.log(
        `\nReplace ${targetVar} in .env with this line. It holds a password: never commit it.\n`,
      );
      console.log(`${targetVar}=${loginUrl(ownerUrl, role, password)}`);
    } else {
      console.log(
        `${role} can already log in, so ${targetVar} in .env stays as it is. Run with --new-password for a new password.`,
      );
    }
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Could not set up the roles: ${reason}. Check ${sourceVar} in .env.`);
  process.exitCode = 1;
} finally {
  await db.destroy();
}

/** The server logs in through Neon's pooler (the host gets -pooler). */
function loginUrl(fromUrl: string, role: LoginRole, password: string): string {
  const url = new URL(fromUrl);
  url.username = role;
  url.password = password;
  const [endpoint, ...rest] = url.hostname.split('.');
  if (endpoint?.startsWith('ep-') && !endpoint.endsWith('-pooler')) {
    url.hostname = [`${endpoint}-pooler`, ...rest].join('.');
  }
  return url.toString();
}
