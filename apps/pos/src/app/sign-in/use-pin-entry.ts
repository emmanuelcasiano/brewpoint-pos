import { PIN_MAX_LENGTH, PIN_MIN_LENGTH, type PinUserEntry } from '@brewpoint/shared';
import { applyNumpadKey, type NumpadKey } from '@brewpoint/ui';
import { useEffect, useState } from 'react';
import type { PosSession } from '../../offline/pos-session';
import { checkPin, currentLock } from './check-pin';
import type { Connection } from './use-pin-users';

export interface PinMessage {
  text: string;
  /** wrong and refused clear when typing starts again; locked stays until the lock ends. */
  kind: 'wrong' | 'locked' | 'refused' | 'short';
}

const ENTER_PIN = `Enter your PIN: ${PIN_MIN_LENGTH} to ${PIN_MAX_LENGTH} digits.`;

/**
 * The PIN screen's state: who is chosen, the digits so far (shown as dots), and the message
 * after a check. The screen holds the PIN and counts the tries, as PinPrompt's README asks.
 */
export function usePinEntry(options: {
  users: PinUserEntry[];
  connection: Connection;
  onSignedIn: (session: PosSession) => void;
  onServerAnswer: (reached: boolean) => void;
  onRefused: () => void;
}) {
  const { users, connection, onSignedIn, onServerAnswer, onRefused } = options;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<PinMessage | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const user = users.find((candidate) => candidate.id === selectedId) ?? null;

  // A lock ends on its own after 5 minutes.
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setTimeout(
      () => {
        setLockedUntil(null);
        setMessage(null);
      },
      Math.max(0, lockedUntil.getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  async function select(userId: string) {
    setSelectedId(userId);
    setPin('');
    setMessage(null);
    setLockedUntil(null);
    const chosen = users.find((candidate) => candidate.id === userId);
    const lock = chosen ? await currentLock(chosen, new Date()) : null;
    if (lock?.kind === 'locked') {
      setMessage({ text: lock.message, kind: 'locked' });
      setLockedUntil(lock.until);
    }
  }

  async function submit() {
    if (!user || checking || lockedUntil) return;
    if (pin.length < PIN_MIN_LENGTH) {
      setMessage({ text: ENTER_PIN, kind: 'short' });
      return;
    }
    setChecking(true);
    try {
      const { outcome, reachedServer } = await checkPin(
        user,
        pin,
        new Date(),
        connection !== 'offline',
      );
      if (reachedServer !== undefined) onServerAnswer(reachedServer);
      setPin('');
      if (outcome.kind === 'signed-in') {
        onSignedIn(outcome.session);
        return;
      }
      setMessage({ text: outcome.message, kind: outcome.kind });
      if (outcome.kind === 'locked') setLockedUntil(outcome.until);
      if (outcome.kind === 'refused') onRefused();
    } finally {
      setChecking(false);
    }
  }

  function press(key: NumpadKey) {
    if (key === 'confirm') {
      void submit();
      return;
    }
    if (message && message.kind !== 'locked') setMessage(null);
    setPin((current) => applyNumpadKey(current, key, PIN_MAX_LENGTH));
  }

  return {
    user,
    pin,
    message,
    locked: lockedUntil !== null,
    checking,
    select: (userId: string) => void select(userId),
    press,
  };
}
