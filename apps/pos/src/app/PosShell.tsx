import type { PosDeviceSummary } from '@brewpoint/shared';
import { Banner, Card, ChipButton, TopBar } from '@brewpoint/ui';
import type { PosSession } from '../offline/pos-session';
import type { Connection } from './sign-in/use-pin-users';
import { UserMenu } from './UserMenu';

/**
 * Signed in on the register: the top bar (shop and device, sync chip, signed-in user) and a
 * placeholder where selling will be (Module 11). The user button opens a menu with Switch user
 * and Sign out.
 */
export function PosShell({
  session,
  device,
  connection,
  onSignOut,
}: {
  session: PosSession;
  device: PosDeviceSummary | null;
  connection: Connection;
  onSignOut: () => Promise<void>;
}) {
  const firstName = session.name.split(' ')[0] ?? session.name;

  return (
    <div className="min-h-screen bg-surface font-sans text-body text-ink">
      <TopBar
        shopName={device?.shopName ?? 'BrewPoint POS'}
        meta={device ? `${device.branchName}, device ${device.name}` : 'This register'}
        sync={<SyncChip connection={connection} />}
        user={
          <UserMenu
            firstName={firstName}
            fullName={session.name}
            role={session.roleName}
            items={[
              { label: 'Switch user', busyLabel: 'Switching user…', onSelect: onSignOut },
              { label: 'Sign out', busyLabel: 'Signing out…', onSelect: onSignOut },
            ]}
          />
        }
      />
      {connection === 'offline' && (
        <Banner tone="offline" title="You are offline.">
          Work is saved on this device and syncs when you reconnect.
        </Banner>
      )}
      <main className="mx-auto grid w-full max-w-[640px] gap-4 p-6">
        <Card title={`Signed in as ${session.name}`} as="h2" meta={session.roleName}>
          <p className="bp-note">
            {session.token
              ? 'Signed in on this register.'
              : 'Signed in on this register while offline. The sign-in syncs when you reconnect.'}{' '}
            Selling is not built yet.
          </p>
        </Card>
      </main>
    </div>
  );
}

function SyncChip({ connection }: { connection: Connection }) {
  if (connection === 'offline') {
    return <ChipButton icon="wifi-off">Offline</ChipButton>;
  }
  if (connection === 'checking') {
    return (
      <ChipButton tone="info" icon="refresh" spin>
        Connecting
      </ChipButton>
    );
  }
  return (
    <ChipButton tone="success" icon="check">
      Synced
    </ChipButton>
  );
}
