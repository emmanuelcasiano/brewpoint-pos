import { ApiRequestError } from '@brewpoint/shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { flushAuthEvents } from '../../offline/auth-events';
import { readPinCache, writePinCache, type PinCache } from '../../offline/pin-cache';

/** How often the staff list is refreshed while online, so changes reach the device. */
export const REFRESH_EVERY_MS = 5 * 60_000;

/** Decided from real requests (and the browser going offline), never from the flag alone. */
export type Connection = 'checking' | 'online' | 'offline';

export interface PinUsersState {
  /** The device's list has been read (it may be empty). */
  loaded: boolean;
  cache: PinCache | null;
  connection: Connection;
  /** Why the server will not give this register a list ("not set up"), when online. */
  problem: string | null;
}

/**
 * The staff list this register signs people in from. It starts from the device's copy, then
 * replaces it from the server whenever it can: on start, every 5 minutes, and when the
 * connection comes back. Sign-ins handled offline are sent at the same time.
 */
export function usePinUsers() {
  const [state, setState] = useState<PinUsersState>({
    loaded: false,
    cache: null,
    connection: 'checking',
    problem: null,
  });

  const setConnection = useCallback((connection: Connection) => {
    setState((current) => ({ ...current, connection }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const fresh = await api.pinUsers();
      await writePinCache(fresh);
      setState((current) => ({ ...current, cache: fresh, connection: 'online', problem: null }));
      await flushAuthEvents((events) => api.sendAuthEvents({ events })).catch(() => 0);
    } catch (error) {
      const offline = !(error instanceof ApiRequestError) || error.offline;
      setState((current) => ({
        ...current,
        connection: offline ? 'offline' : 'online',
        problem: offline ? current.problem : error.message,
      }));
    }
  }, []);

  useEffect(() => {
    let current = true;
    void readPinCache().then((cache) => {
      if (current) setState((now) => ({ ...now, loaded: true, cache: now.cache ?? cache ?? null }));
    });
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_EVERY_MS);
    const online = () => void refresh();
    const offline = () => setConnection('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      current = false;
      clearInterval(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [refresh, setConnection]);

  return { ...state, refresh, setConnection };
}
