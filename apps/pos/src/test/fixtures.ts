import type { PinUserEntry, PinUsersResponse, PosDeviceSummary } from '@brewpoint/shared';

// Argon2id hashes made by the server's library (@node-rs/argon2, m=19456, t=2, p=1), so the
// tests prove the register reads exactly what the server stores.
export const HASH_1234 =
  '$argon2id$v=19$m=19456,t=2,p=1$3P6nYC5r1ZINuKsCvmzJZQ$N2lmIRODlKePazBfEtuwm2X5w0M2BRuf495bDI0H0uQ';
export const HASH_1111 =
  '$argon2id$v=19$m=19456,t=2,p=1$DQJneT96psiNhvqIHCnrPA$opS6RntLcKpZValekGq/v4BsPFHe/EP7OW8Mez65UAM';

export const DEVICE: PosDeviceSummary = {
  id: '0199a001-0000-7000-8000-000000000031',
  name: 'T1',
  branchId: '0199a001-0000-7000-8000-000000000011',
  branchName: 'Main branch',
  shopName: 'Kape Davao',
  accentHex: '#E2A13B',
};

export const ANA: PinUserEntry = {
  id: '0199a001-0000-7000-8000-000000000022',
  name: 'Ana Cruz',
  roleName: 'Cashier',
  pinHash: HASH_1234,
};

export const CARLO: PinUserEntry = {
  id: '0199a001-0000-7000-8000-000000000021',
  name: 'Carlo Reyes',
  roleName: 'Owner',
  pinHash: HASH_1111,
};

export function pinList(users: PinUserEntry[]): PinUsersResponse {
  return { device: DEVICE, users, fetchedAt: '2026-10-03T06:55:00.000Z' };
}
