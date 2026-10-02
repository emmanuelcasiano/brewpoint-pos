import { DEVICE_ID_HEADER, DEVICE_KEY_HEADER } from '@brewpoint/shared';

// Until device pairing (Module 06): this POS is the seeded demo register, and proves it with
// DEMO_DEVICE_KEY from the root .env (the server accepts it only when APP_ENV=local).
// DEMO_DEVICE_ID picks another seeded register; it defaults to Kape Davao's T1.
const KAPE_DAVAO_T1 = '0199a001-0000-7000-8000-000000000031';

export const DEMO_DEVICE = {
  id: import.meta.env.DEMO_DEVICE_ID || KAPE_DAVAO_T1,
  key: import.meta.env.DEMO_DEVICE_KEY ?? '',
};

export function deviceHeaders(): Record<string, string> {
  return { [DEVICE_ID_HEADER]: DEMO_DEVICE.id, [DEVICE_KEY_HEADER]: DEMO_DEVICE.key };
}
