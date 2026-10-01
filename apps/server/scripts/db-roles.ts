import { createOwnerDb } from '../src/db/migrator';
import {
  APP_ROLE,
  appRoleCanLogin,
  bootstrapRoles,
  newRolePassword,
  setAppRolePassword,
} from '../src/db/roles';

const args = process.argv.slice(2);
const forTest = args.includes('--test');
const sourceVar = forTest ? 'MIGRATION_TEST_DATABASE_URL' : 'MIGRATION_DATABASE_URL';
const targetVar = forTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL';

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

  if (args.includes('--new-password') || !(await appRoleCanLogin(db))) {
    const password = newRolePassword();
    await setAppRolePassword(db, password);
    console.log(
      `\nReplace ${targetVar} in .env with this line. It holds a password: never commit it.\n`,
    );
    console.log(`${targetVar}=${appUrl(ownerUrl, password)}`);
  } else {
    console.log(
      `${APP_ROLE} can already log in, so ${targetVar} in .env stays as it is. Run with --new-password for a new password.`,
    );
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Could not set up the roles: ${reason}. Check ${sourceVar} in .env.`);
  process.exitCode = 1;
} finally {
  await db.destroy();
}

/** The app logs in as brewpoint_app through Neon's pooler (the host gets -pooler). */
function appUrl(fromUrl: string, password: string): string {
  const url = new URL(fromUrl);
  url.username = APP_ROLE;
  url.password = password;
  const [endpoint, ...rest] = url.hostname.split('.');
  if (endpoint?.startsWith('ep-') && !endpoint.endsWith('-pooler')) {
    url.hostname = [`${endpoint}-pooler`, ...rest].join('.');
  }
  return url.toString();
}
