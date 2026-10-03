import type { Kysely } from 'kysely';
import { hashSecret } from '../../core/auth/password';
import { withTenant } from '../../core/db/tenant-transaction';
import type { DB } from '../types';
import { SUPERADMIN_ROLE_ID } from './reference';

/** Local only: the password of every demo owner and of the dev staff account. */
export const DEMO_PASSWORD = 'brewpoint-demo';

interface DemoPerson {
  id: string;
  name: string;
  email: string;
  /** Owners sign in to the back-office too; cashiers only use the POS. */
  password: string | null;
  pin: string;
  /** Their user_assignments row. */
  assignmentId: string;
}

interface DemoShop {
  tenant: { id: string; name: string; accent_hex: string };
  branch: { id: string; name: string; address: string };
  /** Placeholder roles until Module 04 builds the real defaults with their permissions. */
  roles: { owner: string; cashier: string };
  /** Assigned to every branch. */
  owner: DemoPerson;
  /** Assigned to the main branch. */
  cashiers: DemoPerson[];
  device: { id: string; name: string; model: string };
}

// Two shops, so isolation can be seen by hand. Fixed IDs, so running the seed again changes nothing.
export const DEMO_SHOPS: readonly DemoShop[] = [
  {
    tenant: {
      id: '0199a001-0000-7000-8000-000000000001',
      name: 'Kape Davao',
      accent_hex: '#E2A13B',
    },
    branch: {
      id: '0199a001-0000-7000-8000-000000000011',
      name: 'Main branch',
      address: 'San Pedro Street, Poblacion District, Davao City',
    },
    roles: {
      owner: '0199a001-0000-7000-8000-000000000041',
      cashier: '0199a001-0000-7000-8000-000000000042',
    },
    owner: {
      id: '0199a001-0000-7000-8000-000000000021',
      name: 'Carlo Reyes',
      email: 'carlo@kapedavao.test',
      password: DEMO_PASSWORD,
      pin: '1111',
      assignmentId: '0199a001-0000-7000-8000-000000000051',
    },
    cashiers: [
      {
        id: '0199a001-0000-7000-8000-000000000022',
        name: 'Ana Cruz',
        email: 'ana@kapedavao.test',
        password: null,
        pin: '1234',
        assignmentId: '0199a001-0000-7000-8000-000000000052',
      },
    ],
    device: { id: '0199a001-0000-7000-8000-000000000031', name: 'T1', model: 'iPad 10th gen' },
  },
  {
    tenant: {
      id: '0199a002-0000-7000-8000-000000000001',
      name: 'Brew Bros Cebu',
      accent_hex: '#1F8A8A',
    },
    branch: {
      id: '0199a002-0000-7000-8000-000000000011',
      name: 'Main branch',
      address: 'Salinas Drive, Lahug, Cebu City',
    },
    roles: {
      owner: '0199a002-0000-7000-8000-000000000041',
      cashier: '0199a002-0000-7000-8000-000000000042',
    },
    owner: {
      id: '0199a002-0000-7000-8000-000000000021',
      name: 'Jake Tan',
      email: 'jake@brewbroscebu.test',
      password: DEMO_PASSWORD,
      pin: '1111',
      assignmentId: '0199a002-0000-7000-8000-000000000051',
    },
    cashiers: [],
    device: { id: '0199a002-0000-7000-8000-000000000031', name: 'T1', model: 'iPad 10th gen' },
  },
];

export const DEMO_STAFF = {
  id: '0199a000-0000-7000-8000-000000001001',
  name: 'BrewPoint Dev',
  email: 'dev@brewpoint.test',
} as const;

const LICENSE_EXPIRES_AT = '2027-10-02T00:00:00+08:00';

/**
 * Local and CI only. Each shop is written through withTenant, the same way the app writes,
 * because row-level security applies to the migrator too. The roles are placeholders with no
 * permissions until Module 04.
 */
export async function seedDemo(db: Kysely<DB>): Promise<void> {
  for (const shop of DEMO_SHOPS) {
    await withTenant(db, shop.tenant.id, async (trx) => {
      await trx
        .insertInto('tenants')
        .values({ ...shop.tenant, timezone: 'Asia/Manila', status: 'trial' })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
      await trx
        .insertInto('branches')
        .values({ ...shop.branch, tenant_id: shop.tenant.id, is_active: true })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
      await trx
        .insertInto('roles')
        .values([
          {
            id: shop.roles.owner,
            tenant_id: shop.tenant.id,
            name: 'Owner',
            summary: 'Runs the shop.',
            is_locked: true,
          },
          {
            id: shop.roles.cashier,
            tenant_id: shop.tenant.id,
            name: 'Cashier',
            summary: 'Sells at the counter.',
            is_locked: false,
          },
        ])
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
      await seedPerson(trx, shop, shop.owner, { roleId: shop.roles.owner, branchId: null });
      for (const cashier of shop.cashiers) {
        await seedPerson(trx, shop, cashier, {
          roleId: shop.roles.cashier,
          branchId: shop.branch.id,
        });
      }
      await trx
        .insertInto('devices')
        .values({
          ...shop.device,
          tenant_id: shop.tenant.id,
          branch_id: shop.branch.id,
          app_version: '0.1.0',
          license_expires_at: LICENSE_EXPIRES_AT,
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
    });
  }
}

/**
 * The user and their assignment. A user seeded before Module 03 has no password or PIN; they
 * get them now. Anyone who already has one is left alone, so a second run changes nothing.
 */
async function seedPerson(
  trx: Kysely<DB>,
  shop: DemoShop,
  person: DemoPerson,
  assignment: { roleId: string; branchId: string | null },
): Promise<void> {
  await trx
    .insertInto('users')
    .values({
      id: person.id,
      tenant_id: shop.tenant.id,
      name: person.name,
      email: person.email,
      status: 'active',
      password_hash: person.password ? await hashSecret(person.password) : null,
      pin_hash: await hashSecret(person.pin),
    })
    .onConflict((oc) =>
      oc
        .column('id')
        .doUpdateSet((eb) => ({
          password_hash: eb.ref('excluded.password_hash'),
          pin_hash: eb.ref('excluded.pin_hash'),
        }))
        .where((eb) =>
          eb.and([eb('users.password_hash', 'is', null), eb('users.pin_hash', 'is', null)]),
        ),
    )
    .execute();
  await trx
    .insertInto('user_assignments')
    .values({
      id: person.assignmentId,
      tenant_id: shop.tenant.id,
      user_id: person.id,
      branch_id: assignment.branchId,
      role_id: assignment.roleId,
    })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
}

/** Local only: a Superadmin to sign in to the staff console with. Two-step is set up on first use. */
export async function seedDemoStaff(db: Kysely<DB>): Promise<void> {
  await db
    .insertInto('platform_users')
    .values({
      ...DEMO_STAFF,
      password_hash: await hashSecret(DEMO_PASSWORD),
      role_id: SUPERADMIN_ROLE_ID,
      status: 'active',
    })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
}
