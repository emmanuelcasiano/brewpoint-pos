import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from './codes';

describe('PERMISSIONS', () => {
  it('lists each code once, so the seed can insert them in one statement', () => {
    const codes = PERMISSIONS.map((p) => p.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('uses lowercase dotted codes like sale.void.approve', () => {
    for (const { code } of PERMISSIONS) {
      expect(code).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
    }
  });

  it('includes the stock alert permissions that are not in the PermissionMatrix preview', () => {
    const codes = PERMISSIONS.map((p) => p.code);

    expect(codes).toEqual(
      expect.arrayContaining(['inventory.alerts.view', 'inventory.alerts.settings']),
    );
  });
});
