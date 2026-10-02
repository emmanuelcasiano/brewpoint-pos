// Set at build time by @brewpoint/config/vite.
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

// From the root .env (appConfig's envPrefix), until device pairing in Module 06.
interface ImportMetaEnv {
  readonly DEMO_DEVICE_ID?: string;
  readonly DEMO_DEVICE_KEY?: string;
}
