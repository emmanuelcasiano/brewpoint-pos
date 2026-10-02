import { formatPeso } from '@brewpoint/shared';

export function App() {
  return (
    <main className="grid min-h-screen place-content-center gap-2 bg-surface p-4 text-center font-sans text-body text-ink">
      <h1 className="font-display text-display-lg">BrewPoint Staff console</h1>
      <p>
        Version {__APP_VERSION__} ({__APP_COMMIT__})
      </p>
      <p>Workspace check: {formatPeso(124500)}</p>
    </main>
  );
}
