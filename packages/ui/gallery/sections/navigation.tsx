import { ChipButton, StatusChip, TopBar, UserButton } from '../../src';
import type { GallerySection } from '../Specimen';
import { ConsoleNavDemo, SideNavDemo } from './navigation-demos';

const SHOP = { shopName: 'Kape Davao', meta: 'Main branch, device T1' };

export const topBarSection: GallerySection = {
  id: 'top-bar',
  title: 'TopBar and UserButton',
  preview: 'Navigation',
  wide: true,
  render: () => (
    <div className="bp-stack gap-2">
      <span className="bp-eyebrow">POS top bar</span>
      <TopBar
        {...SHOP}
        className="rounded-lg border border-border"
        register={<StatusChip icon="check">Register open</StatusChip>}
        sync={
          <ChipButton tone="success" icon="check">
            Synced
          </ChipButton>
        }
        user={<UserButton name="Ana" role="Cashier" />}
      />
      <TopBar
        {...SHOP}
        className="rounded-lg border border-border"
        register={<StatusChip icon="check">Register open</StatusChip>}
        sync={<ChipButton icon="wifi-off">Offline, 2 sales waiting</ChipButton>}
        user={<UserButton name="Ana" role="Cashier" />}
      />
      <TopBar
        {...SHOP}
        className="rounded-lg border border-border"
        license={
          <StatusChip tone="warning" icon="clock">
            License: 2 days offline left
          </StatusChip>
        }
        sync={
          <ChipButton tone="info" icon="refresh" spin>
            Syncing 3 sales
          </ChipButton>
        }
        user={<UserButton name="Ana" role="Cashier" />}
      />
      <TopBar
        {...SHOP}
        className="rounded-lg border border-border"
        register={<StatusChip icon="lock">Register closed</StatusChip>}
        sync={
          <ChipButton tone="warning" icon="alert">
            1 needs attention
          </ChipButton>
        }
        user={<UserButton name="Maria" role="Manager" />}
      />
    </div>
  ),
};

export const sideNavSection: GallerySection = {
  id: 'side-nav',
  title: 'SideNav',
  preview: 'Navigation',
  render: () => (
    <div className="bp-stack gap-2">
      <span className="bp-eyebrow">Back-office side navigation</span>
      <SideNavDemo />
    </div>
  ),
};

export const consoleNavSection: GallerySection = {
  id: 'console-nav',
  title: 'ConsoleNav',
  preview: 'ConsoleShopsScreen',
  render: () => <ConsoleNavDemo />,
};
