import { createHash, timingSafeEqual } from 'node:crypto';
import type { Database } from '../db/client';
import { withTenant } from '../db/tenant-transaction';
import { DEMO_SHOPS } from '../../db/seed/demo';

/** The POS device a request comes from. */
export interface DeviceIdentity {
  deviceId: string;
  tenantId: string;
  branchId: string;
  /** "T1", for audit sentences. */
  name: string;
}

export interface DemoDeviceConfig {
  appEnv: 'local' | 'staging' | 'production';
  demoDeviceKey?: string;
}

// The seeded demo registers, by device id.
const DEMO_DEVICES = new Map(DEMO_SHOPS.map((shop) => [shop.device.id, shop.tenant.id]));

function sameKey(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Temporary, until device pairing (Module 06) gives each register its own credential:
 * a request is from a POS device only when the server runs locally, DEMO_DEVICE_KEY is set
 * and matches, and the device is one of the seeded demo registers and not revoked.
 * In staging and production this always answers null.
 */
export async function resolveDemoDevice(
  db: Database,
  config: DemoDeviceConfig,
  deviceId: string,
  key: string,
): Promise<DeviceIdentity | null> {
  if (config.appEnv !== 'local' || !config.demoDeviceKey) return null;
  if (!sameKey(key, config.demoDeviceKey)) return null;
  const tenantId = DEMO_DEVICES.get(deviceId);
  if (!tenantId) return null;

  const device = await withTenant(db, tenantId, (trx) =>
    trx
      .selectFrom('devices')
      .select(['id', 'branch_id', 'name'])
      .where('id', '=', deviceId)
      .where('revoked_at', 'is', null)
      .executeTakeFirst(),
  );
  return device
    ? { deviceId: device.id, tenantId, branchId: device.branch_id, name: device.name }
    : null;
}
