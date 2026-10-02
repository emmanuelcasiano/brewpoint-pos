import { Banner, ChipButton, StatusChip, Toast } from '../../src';
import type { GallerySection } from '../Specimen';

// Gallery actions do nothing; the components are on show, not wired to a screen.
const noop = () => undefined;

export const statusChipSection: GallerySection = {
  id: 'status-chip',
  title: 'StatusChip and ChipButton',
  preview: 'StatusChip',
  render: () => (
    <div className="bp-stack gap-5">
      <div className="bp-stack gap-2">
        <span className="bp-eyebrow">Sync (tappable)</span>
        <div className="bp-row">
          <ChipButton tone="success" icon="check">
            Synced
          </ChipButton>
          <ChipButton tone="info" icon="refresh" spin>
            Syncing 3 sales
          </ChipButton>
          <ChipButton icon="wifi-off">Offline, 2 sales waiting</ChipButton>
          <ChipButton tone="warning" icon="alert">
            1 needs attention
          </ChipButton>
        </div>
      </div>
      <div className="bp-stack gap-2">
        <span className="bp-eyebrow">Stock and expiry</span>
        <div className="bp-row">
          <StatusChip tone="success" icon="check">
            In stock
          </StatusChip>
          <StatusChip tone="warning" icon="alert">
            Low, 3 left
          </StatusChip>
          <StatusChip tone="danger" icon="x">
            Out of stock
          </StatusChip>
          <StatusChip tone="danger" icon="alert">
            Negative stock
          </StatusChip>
          <StatusChip tone="warning" icon="clock">
            Expires in 2 days
          </StatusChip>
          <StatusChip tone="danger" icon="calendar-x">
            Expired
          </StatusChip>
        </div>
      </div>
      <div className="bp-stack gap-2">
        <span className="bp-eyebrow">Subscription and register</span>
        <div className="bp-row">
          <StatusChip tone="info" icon="clock">
            Trial, 9 days left
          </StatusChip>
          <StatusChip tone="success" icon="check">
            Active
          </StatusChip>
          <StatusChip tone="warning" icon="alert">
            Payment failed
          </StatusChip>
          <StatusChip tone="danger" icon="lock">
            Suspended
          </StatusChip>
          <StatusChip icon="lock">Register closed</StatusChip>
        </div>
      </div>
    </div>
  ),
};

export const bannerSection: GallerySection = {
  id: 'banner',
  title: 'Banner',
  preview: 'Banner',
  render: () => (
    <div className="bp-stack max-w-[760px]">
      <Banner tone="offline" title="You are offline.">
        Sales are saved on this device and will sync when you reconnect.
      </Banner>
      <Banner
        tone="warning"
        icon="clock"
        title="Offline license ends in 2 days."
        action={{ label: 'Sync now', onClick: noop }}
      >
        Connect to the internet to renew it.
      </Banner>
      <Banner title="Your trial ends in 9 days." action={{ label: 'Choose plan', onClick: noop }}>
        Add a plan to keep selling after Oct 6.
      </Banner>
      <Banner
        tone="danger"
        title="Selling is paused."
        action={{ label: 'Try again', onClick: noop }}
      >
        This device could not verify your subscription. Connect to the internet to continue.
      </Banner>
    </div>
  ),
};

export const toastSection: GallerySection = {
  id: 'toast',
  title: 'Toast',
  preview: 'NotificationCenter',
  render: () => (
    <div className="bp-stack gap-3">
      <span className="bp-eyebrow">Toast, when an alert starts</span>
      <Toast
        icon="alert"
        title="Oat milk is low."
        action={{ label: 'View', onClick: noop }}
        onDismiss={noop}
      >
        500 ml left at Main branch.
      </Toast>
      <Toast
        icon="x"
        title="Bottled Water is out of stock."
        action={{ label: 'Reorder', onClick: noop }}
        onDismiss={noop}
      >
        Hidden from the POS.
      </Toast>
      <p className="bp-note">
        In the gallery the 8-second dismissal does nothing, so the toasts stay for comparison.
      </p>
    </div>
  ),
};
