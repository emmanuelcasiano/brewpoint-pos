import type { TenantTransaction } from '../db/tenant-transaction';

export type Surface = 'backoffice' | 'pos';

export interface RoleAssignment {
  /** null: every branch. */
  branchId: string | null;
  roleId: string;
  roleName: string;
}

/** Who is asking, on every shop request: the back-office or a POS device. */
export interface ShopIdentity {
  kind: 'shop';
  sessionId: string;
  surface: Surface;
  userId: string;
  name: string;
  email: string;
  tenantId: string;
  /** The POS device the session is on; null on the back-office. */
  deviceId: string | null;
  /** Active branches the user works in; an all-branches assignment expands to every one. */
  branchIds: string[];
  roles: RoleAssignment[];
}

export type StaffStage = 'two_step' | 'two_step_setup' | 'active';

/** Who is asking, on every staff console request. Staff have no tenant. */
export interface StaffIdentity {
  kind: 'staff';
  sessionId: string;
  staffId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  /** Only `active` may use the console; the others may only finish two-step. */
  stage: StaffStage;
  twoStepOn: boolean;
}

/** The user's roles and the active branches they reach. */
export async function loadBranchAccess(
  trx: TenantTransaction,
  userId: string,
): Promise<{ branchIds: string[]; roles: RoleAssignment[] }> {
  const roles = await trx
    .selectFrom('user_assignments')
    .innerJoin('roles', 'roles.id', 'user_assignments.role_id')
    .select([
      'user_assignments.branch_id as branchId',
      'roles.id as roleId',
      'roles.name as roleName',
    ])
    .where('user_assignments.user_id', '=', userId)
    .orderBy('roles.name')
    .execute();
  if (roles.length === 0) return { branchIds: [], roles };

  const everyBranch = roles.some((role) => role.branchId === null);
  const assigned = roles.flatMap((role) => (role.branchId ? [role.branchId] : []));
  const branches = await trx
    .selectFrom('branches')
    .select('id')
    .where('is_active', '=', true)
    .$if(!everyBranch, (qb) => qb.where('id', 'in', assigned))
    .orderBy('id')
    .execute();
  return { branchIds: branches.map((branch) => branch.id), roles };
}
