import type { Kysely } from 'kysely';
import { withTenant } from '../../core/db/tenant-transaction';
import type { DB } from '../types';

interface DemoShop {
  tenant: { id: string; name: string; accent_hex: string };
  branch: { id: string; name: string; address: string };
  owner: { id: string; name: string; email: string };
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
    owner: {
      id: '0199a001-0000-7000-8000-000000000021',
      name: 'Carlo Reyes',
      email: 'carlo@kapedavao.test',
    },
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
    owner: {
      id: '0199a002-0000-7000-8000-000000000021',
      name: 'Jake Tan',
      email: 'jake@brewbroscebu.test',
    },
    device: { id: '0199a002-0000-7000-8000-000000000031', name: 'T1', model: 'iPad 10th gen' },
  },
];

const LICENSE_EXPIRES_AT = '2027-10-02T00:00:00+08:00';

/**
 * Local and CI only. Each shop is written through withTenant, the same way the app writes,
 * because row-level security applies to the migrator too. The owners have no password, PIN
 * or role yet: sign-in comes in Module 03 and roles in Module 04.
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
        .insertInto('users')
        .values({ ...shop.owner, tenant_id: shop.tenant.id, status: 'active' })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
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
