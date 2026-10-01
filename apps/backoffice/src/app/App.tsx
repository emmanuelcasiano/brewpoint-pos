import { formatPeso } from '@brewpoint/shared';

export function App() {
  return (
    <main className="grid min-h-screen place-content-center gap-2 p-4 text-center">
      <h1 className="text-2xl font-semibold">BrewPoint Back-office</h1>
      <p>
        Version {__APP_VERSION__} ({__APP_COMMIT__})
      </p>
      <p>Workspace check: {formatPeso(124500)}</p>
    </main>
  );
}
