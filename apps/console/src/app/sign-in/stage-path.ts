import type { StaffMe } from '@brewpoint/shared';

/**
 * Where a staff member belongs at their stage: the code step, setup (required from the second
 * sign-in, or offered on the first), or the console.
 */
export function stagePath(me: StaffMe, offerSetup: boolean): string {
  if (me.stage === 'two_step') return '/two-step';
  if (me.stage === 'two_step_setup') return '/two-step/setup';
  return offerSetup ? '/two-step/setup' : '/';
}
