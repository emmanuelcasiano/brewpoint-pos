/** Helpers exposed on window.BrewPoint by components/bundle.js. Components themselves are CSS classes prefixed `bp-` in bundle.css. */
declare namespace BrewPoint {
  interface Accent {
    /** Fill of the primary button and selected category. */
    accent: string;
    accentHover: string;
    accentPressed: string;
    /** Dark ink (#2B1D14) or white, whichever reads better on `accent`. Every pair is at least 4.5:1. */
    onAccent: string;
    accentSoft: string;
    /** Accent-colored text and borders; at least 4.5:1 on surface-raised and accentSoft. */
    accentStrong: string;
  }

  /** Derive every accent token from one shop hex (#RRGGBB) for the given theme. */
  function deriveAccent(hex: string, theme: 'light' | 'dark'): Accent;

  /** Derive and set --accent, --accent-hover, --accent-pressed, --on-accent, --accent-soft and --accent-strong on an element. */
  function applyAccent(el: HTMLElement, hex: string, theme: 'light' | 'dark'): Accent;

  /** WCAG 2 contrast ratio between two #RRGGBB colors. */
  function contrast(a: string, b: string): number;

  /** Integer centavos to text, e.g. 124500 becomes "₱1,245.00". The only place money becomes a string. */
  function formatPeso(centavos: number): string;

  /** Compact pesos for chart axes only, e.g. 1250000 becomes "₱12.5k". Tooltips and tables use formatPeso. */
  function formatPesoShort(centavos: number): string;

  interface ChartSeries {
    name: string;
    /** Money in integer centavos when format is "peso". */
    values: number[];
    /** A color token name: "chart-1" to "chart-4". Defaults to fixed order. */
    color?: string;
    /** The comparison period: drawn dashed in chart-compare. */
    compare?: boolean;
  }
  interface ChartSpec {
    /** bar: a measure per time bucket; line: a trend with an optional comparison; hbar: a ranked list with values printed. */
    type: 'bar' | 'line' | 'hbar';
    labels: string[];
    series: ChartSeries[];
    format?: 'peso' | 'count' | 'pct';
    /** Plot height in px for bar and line (default 220). */
    height?: number;
    /** Accessible name of the SVG. */
    title?: string;
    /** hbar only: px reserved for row labels (default 140). */
    labelWidth?: number;
  }
  /** Draw a chart into el as SVG sized to its width, with legend (2+ series) and hover tooltip. */
  function chart(el: HTMLElement, spec: ChartSpec): HTMLElement;

  /** SVG markup for a 96x28 trend line (decoration for a StatTile). mount() fills <span data-spark="1,2,3" data-color="chart-1">. */
  function sparkline(values: number[], color?: string): string;

  /** Inner markup of the back-office side navigation. Keys: dashboard, alerts, transactions, reports, sessions, products, inventory, expiry, purchases, suppliers, users, devices, audit, subscription, settings. mount() fills <nav data-sidenav="inventory"> with it. */
  function sidenav(current: string, counts?: { alerts?: number; inventory?: number }, hide?: string[]): string;

  /** Inner markup of the staff console (superadmin) navigation. Keys: overview, shops, support, tickets, billing, plans, flags, releases, announcements, datarequests, audit, staff. mount() fills <nav data-adminnav="shops">. */
  function adminnav(current: string, counts?: { tickets?: number; support?: number; datarequests?: number }): string;

  /** SVG markup for a bundled stroke icon (24px grid, currentColor). */
  function icon(name: string, size?: number): string;

  /** Names accepted by icon(). */
  const icons: string[];

  /** Replace <i data-icon="name" data-size="20"> with the icon and fill <span data-peso="14500"> with formatted pesos, <span data-spark> with a sparkline, and <nav data-sidenav="key"> with the side navigation. */
  function mount(root?: ParentNode): void;
}
