import { PIN_MAX_LENGTH, PIN_MIN_LENGTH, type PinUserEntry } from '@brewpoint/shared';
import { Banner, Icon, Numpad, PinDots } from '@brewpoint/ui';
import type { PosSession } from '../../offline/pos-session';
import { usePinEntry, type PinMessage } from './use-pin-entry';
import { UserPicker } from './UserPicker';
import type { PinUsersState } from './use-pin-users';

/**
 * PIN sign-in on the register: the people above, the PIN dots and keypad below (the layout
 * guideline's PIN login). It looks and works the same online and offline; offline only adds
 * the neutral banner.
 */
export function PinSignIn({
  pinUsers,
  notice,
  onSignedIn,
  onServerAnswer,
  onRefused,
}: {
  pinUsers: PinUsersState;
  /** Shown once above the list, such as why someone was signed out. */
  notice?: string | null;
  onSignedIn: (session: PosSession) => void;
  onServerAnswer: (reached: boolean) => void;
  onRefused: () => void;
}) {
  const users = pinUsers.cache?.users ?? [];
  const entry = usePinEntry({
    users,
    connection: pinUsers.connection,
    onSignedIn,
    onServerAnswer,
    onRefused,
  });
  const device = pinUsers.cache?.device;

  return (
    <main className="min-h-screen bg-surface font-sans text-body text-ink">
      {pinUsers.connection === 'offline' && (
        <Banner tone="offline" title="You are offline.">
          You can still sign in. Sign-ins are saved on this device and sync when you reconnect.
        </Banner>
      )}
      <div className="mx-auto grid w-full max-w-[760px] justify-items-center gap-4 px-6 py-4">
        <header className="text-center">
          <h1 className="font-display text-heading-md">{device?.shopName ?? 'BrewPoint POS'}</h1>
          {device && (
            <p className="text-ink-muted">
              {device.branchName}, device {device.name}
            </p>
          )}
        </header>
        {notice && <Banner tone="info" title={notice} />}
        <SignInBody pinUsers={pinUsers} entry={entry} users={users} />
        <p className="text-caption text-ink-muted">
          Version {__APP_VERSION__} ({__APP_COMMIT__})
        </p>
      </div>
    </main>
  );
}

function SignInBody({
  pinUsers,
  entry,
  users,
}: {
  pinUsers: PinUsersState;
  entry: ReturnType<typeof usePinEntry>;
  users: PinUserEntry[];
}) {
  if (!pinUsers.loaded || (users.length === 0 && pinUsers.connection === 'checking')) {
    return (
      <p role="status" aria-busy="true" className="text-ink-muted">
        Loading the staff list…
      </p>
    );
  }
  if (users.length === 0) {
    return (
      <Banner tone="warning" title="No one can sign in on this device yet.">
        {pinUsers.connection === 'offline'
          ? 'Connect to the internet to load the staff list.'
          : (pinUsers.problem ?? 'Ask the owner to add people to this branch.')}
      </Banner>
    );
  }

  const length = Math.min(PIN_MAX_LENGTH, Math.max(PIN_MIN_LENGTH, entry.pin.length));
  return (
    <>
      <section className="grid w-full gap-3" aria-labelledby="who">
        <h2 id="who" className="text-heading-sm">
          Who is signing in?
        </h2>
        <UserPicker users={users} selectedId={entry.user?.id ?? null} onSelect={entry.select} />
      </section>
      <section className="grid w-[320px] justify-items-center gap-3" aria-label="PIN">
        <p className="text-body">
          {entry.user
            ? `${entry.user.name}, enter your PIN`
            : 'Choose your name, then enter your PIN'}
        </p>
        <PinDots
          filled={entry.pin.length}
          length={length}
          error={entry.message?.kind === 'wrong' || entry.message?.kind === 'locked'}
        />
        <PinError message={entry.message} />
        <Numpad
          label="PIN keypad"
          onKey={entry.press}
          disabled={!entry.user || entry.locked || entry.checking}
          confirmLabel="Sign in"
          confirmDisabled={entry.pin.length < PIN_MIN_LENGTH}
        />
      </section>
    </>
  );
}

function PinError({ message }: { message: PinMessage | null }) {
  if (!message) return null;
  return (
    <p className="bp-field__error justify-center text-center" role="alert">
      <Icon name={message.kind === 'locked' ? 'lock' : 'alert'} size={16} />
      {message.text}
    </p>
  );
}
