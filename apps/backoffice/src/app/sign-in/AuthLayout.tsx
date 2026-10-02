import { Banner, Card, type BannerTone } from '@brewpoint/ui';
import type { ReactNode } from 'react';

export interface PageBanner {
  tone: BannerTone;
  title: string;
}

/** The frame of the signed-out pages: the BrewPoint name, one card, and a banner above it. */
export function AuthLayout({
  title,
  banner,
  children,
}: {
  /** Names the task: "Sign in", "Set your password". */
  title: string;
  banner?: PageBanner | null;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface p-4 font-sans text-body text-ink">
      <div className="bp-stack w-full max-w-[440px]">
        <h1 className="font-display text-display-lg">BrewPoint</h1>
        {banner && <Banner tone={banner.tone} title={banner.title} />}
        <Card title={title} as="h2" meta="Back-office">
          {children}
        </Card>
        <p className="text-caption text-ink-muted">
          Version {__APP_VERSION__} ({__APP_COMMIT__})
        </p>
      </div>
    </main>
  );
}

/** While the first session check runs. */
export function CheckingSession() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-surface p-4 font-sans text-body text-ink-muted"
      aria-busy="true"
    >
      <p role="status">Checking your sign-in…</p>
    </main>
  );
}
