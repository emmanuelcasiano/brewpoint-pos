import { uuidv7, type DeviceAuthEventInput, type DeviceAuthEventType } from '@brewpoint/shared';
import { allItems, deleteItem, putItem } from './local-store';

/**
 * Remembers a sign-in, sign-out or PIN lock the register handled by itself, for the audit log.
 * The id is made here, so sending it twice still records it once.
 */
export async function queueAuthEvent(
  type: DeviceAuthEventType,
  userId: string,
  happenedAt: Date,
): Promise<void> {
  const event: DeviceAuthEventInput = {
    id: uuidv7(),
    type,
    userId,
    happenedAt: happenedAt.toISOString(),
  };
  await putItem('auth_events', event.id, event);
}

export async function pendingAuthEvents(): Promise<DeviceAuthEventInput[]> {
  const events = await allItems<DeviceAuthEventInput>('auth_events');
  return events.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * Sends what is waiting, oldest first. Once the server answers, every sent event is done: it
 * was recorded, recorded before, or names a person the shop no longer has. If sending fails
 * the events stay for next time.
 */
export async function flushAuthEvents(
  send: (events: DeviceAuthEventInput[]) => Promise<unknown>,
): Promise<number> {
  const events = await pendingAuthEvents();
  if (events.length === 0) return 0;
  await send(events);
  await Promise.all(events.map((event) => deleteItem('auth_events', event.id)));
  return events.length;
}
