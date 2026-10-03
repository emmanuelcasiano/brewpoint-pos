import { ApiRequestError, OFFLINE_MESSAGE, type PinUsersResponse } from '@brewpoint/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api-client';
import { pendingAuthEvents, queueAuthEvent } from '../../offline/auth-events';
import { resetLocalStore } from '../../offline/local-store';
import { writePinCache } from '../../offline/pin-cache';
import { writePosSession } from '../../offline/pos-session';
import { ANA, CARLO, pinList } from '../../test/fixtures';
import { App } from '../App';

vi.mock('../../lib/api-client', () => ({
  api: { pinUsers: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), sendAuthEvents: vi.fn() },
}));

const mocked = vi.mocked(api);
const offline = () => new ApiRequestError(0, 'offline', OFFLINE_MESSAGE);

/** 3:00 PM in Manila. Only the clock is fake, so IndexedDB and the PIN check run as usual. */
const START = new Date('2026-10-03T07:00:00Z');

function renderApp() {
  const user = userEvent.setup();
  render(<App />);
  return user;
}

async function choose(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
}

async function enterPin(user: ReturnType<typeof userEvent.setup>, pin: string) {
  const keypad = screen.getByRole('group', { name: 'PIN keypad' });
  for (const digit of pin) await user.click(within(keypad).getByRole('button', { name: digit }));
  await user.click(within(keypad).getByRole('button', { name: 'Sign in' }));
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
  await resetLocalStore();
  mocked.pinUsers.mockRejectedValue(offline());
  mocked.signIn.mockRejectedValue(offline());
  mocked.signOut.mockRejectedValue(offline());
  mocked.sendAuthEvents.mockResolvedValue({ recorded: 0, skipped: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('offline PIN sign-in', () => {
  it('signs Ana in with PIN 1234 from the cache on a register with no internet', async () => {
    await writePinCache(pinList([ANA, CARLO]));
    const user = renderApp();

    expect(await screen.findByText('You are offline.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Kape Davao' })).toBeVisible();
    const keypad = screen.getByRole('group', { name: 'PIN keypad' });
    expect(within(keypad).getByRole('button', { name: '1' })).toBeDisabled();
    await choose(user, 'Ana Cruz');
    expect(screen.getByRole('button', { name: /^Ana Cruz/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^Carlo Reyes/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(within(keypad).getByRole('button', { name: '1' })).toBeEnabled();
    await enterPin(user, '1234');

    expect(await screen.findByRole('heading', { name: 'Signed in as Ana Cruz' })).toBeVisible();
    expect(screen.getByText(/Signed in on this register while offline/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Offline' })).toBeVisible();
    expect(mocked.signIn).not.toHaveBeenCalled();
    expect(await pendingAuthEvents()).toMatchObject([{ type: 'signed_in', userId: ANA.id }]);
  });

  it('counts down wrong PINs and locks Ana on this device for 5 minutes after five', async () => {
    await writePinCache(pinList([ANA, CARLO]));
    const user = renderApp();
    await choose(user, 'Ana Cruz');

    await enterPin(user, '0000');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Wrong PIN. 4 tries left on this device.',
    );
    expect(screen.getByRole('img', { name: '0 of 4 digits entered' })).toHaveClass('bp-pin--error');
    await enterPin(user, '0000');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Wrong PIN. 3 tries left on this device.',
    );
    await enterPin(user, '0000');
    await enterPin(user, '0000');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Wrong PIN. 1 try left on this device.',
    );
    await enterPin(user, '0000');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Wrong PIN 5 times. Ana Cruz is locked on this device until 3:05 PM.',
      ),
    );
    const keypad = screen.getByRole('group', { name: 'PIN keypad' });
    expect(within(keypad).getByRole('button', { name: '1' })).toBeDisabled();
    expect(await pendingAuthEvents()).toMatchObject([{ type: 'pin_locked', userId: ANA.id }]);

    // Carlo is not locked; Ana is still locked when chosen again a minute later.
    await choose(user, 'Carlo Reyes');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    vi.setSystemTime(new Date('2026-10-03T07:04:00Z'));
    await choose(user, 'Ana Cruz');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'locked on this device until 3:05 PM',
    );

    vi.setSystemTime(new Date('2026-10-03T07:05:00Z'));
    await choose(user, 'Carlo Reyes');
    await choose(user, 'Ana Cruz');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await enterPin(user, '1234');
    expect(await screen.findByRole('heading', { name: 'Signed in as Ana Cruz' })).toBeVisible();
  });

  it('says there is no one to sign in when the device has no list and no internet', async () => {
    renderApp();

    expect(await screen.findByText('No one can sign in on this device yet.')).toBeVisible();
    expect(screen.getByText('Connect to the internet to load the staff list.')).toBeVisible();
  });

  it('shows a loading state while starting and while the staff list loads', async () => {
    mocked.pinUsers.mockReturnValue(new Promise(() => {}));
    renderApp();

    expect(screen.getByRole('status')).toHaveTextContent('Starting the register…');
    expect(await screen.findByText('Loading the staff list…')).toBeVisible();
  });
});

describe('online PIN sign-in', () => {
  it('loads the list from the server, opens a server session, and signs out there', async () => {
    mocked.pinUsers.mockResolvedValue(pinList([ANA, CARLO]));
    mocked.signIn.mockResolvedValue({ token: 'tok', me: {} as never });
    mocked.signOut.mockResolvedValue(undefined);
    const user = renderApp();

    await choose(user, 'Carlo Reyes');
    await enterPin(user, '1111');

    expect(await screen.findByRole('heading', { name: 'Signed in as Carlo Reyes' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Synced' })).toBeVisible();
    expect(mocked.signIn).toHaveBeenCalledWith({ userId: CARLO.id, pin: '1111' });
    expect(await pendingAuthEvents()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Carlo, Owner' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Who is signing in?' })).toBeVisible();
    expect(mocked.signOut).toHaveBeenCalledWith('tok');
  });

  it('drops a deactivated person from the picker at the next refresh', async () => {
    await writePinCache(pinList([ANA, CARLO]));
    mocked.pinUsers.mockResolvedValue(pinList([CARLO]));
    renderApp();

    expect(await screen.findByRole('button', { name: /^Carlo Reyes/ })).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^Ana Cruz/ })).not.toBeInTheDocument(),
    );
  });

  it('signs out someone the refreshed list no longer has, saying why', async () => {
    await writePinCache(pinList([ANA, CARLO]));
    await writePosSession({
      userId: ANA.id,
      name: 'Ana Cruz',
      roleName: 'Cashier',
      token: null,
      signedInAt: START.toISOString(),
    });
    let deliver: (list: PinUsersResponse) => void = () => {};
    mocked.pinUsers.mockReturnValue(new Promise((resolve) => (deliver = resolve)));
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Signed in as Ana Cruz' })).toBeVisible();
    deliver(pinList([CARLO]));

    expect(
      await screen.findByText('Ana Cruz can no longer use this register, so they were signed out.'),
    ).toBeVisible();
  });

  it('believes the server over a stale list, and refreshes it', async () => {
    mocked.pinUsers.mockResolvedValue(pinList([ANA, CARLO]));
    mocked.signIn.mockRejectedValue(
      new ApiRequestError(
        403,
        'pin_user_unavailable',
        'This person cannot sign in on this register.',
      ),
    );
    const user = renderApp();

    await choose(user, 'Ana Cruz');
    await enterPin(user, '1234');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This person cannot sign in on this register.',
    );
    expect(
      screen.queryByRole('heading', { name: 'Signed in as Ana Cruz' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mocked.pinUsers).toHaveBeenCalledTimes(2));
  });

  it('sends the sign-ins it handled offline once it is back online', async () => {
    await writePinCache(pinList([ANA]));
    await queueAuthEvent('signed_in', ANA.id, START);
    mocked.pinUsers.mockResolvedValue(pinList([ANA]));
    renderApp();

    await waitFor(() => expect(mocked.sendAuthEvents).toHaveBeenCalledOnce());
    expect(mocked.sendAuthEvents.mock.calls[0]?.[0].events).toMatchObject([
      { type: 'signed_in', userId: ANA.id },
    ]);
    await waitFor(async () => expect(await pendingAuthEvents()).toEqual([]));
  });

  it('says the register is not set up when the server does not know it', async () => {
    mocked.pinUsers.mockRejectedValue(
      new ApiRequestError(
        401,
        'device_unknown',
        'This register is not set up to use BrewPoint yet. Ask the owner to pair it.',
      ),
    );
    renderApp();

    expect(
      await screen.findByText(
        'This register is not set up to use BrewPoint yet. Ask the owner to pair it.',
      ),
    ).toBeVisible();
    expect(screen.queryByText('You are offline.')).not.toBeInTheDocument();
  });

  it('keeps the person signed in after a reload', async () => {
    await writePinCache(pinList([ANA]));
    await writePosSession({
      userId: ANA.id,
      name: 'Ana Cruz',
      roleName: 'Cashier',
      token: 'tok',
      signedInAt: START.toISOString(),
    });
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Signed in as Ana Cruz' })).toBeVisible();
  });
});
