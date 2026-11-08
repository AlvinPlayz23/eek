export type LandingEnv = {
  readonly VITE_TELEGRAM_URL?: string;
  readonly VITE_DASHBOARD_URL?: string;
  readonly VITE_SITE_URL?: string;
};

// Typed view of the Vite environment. Everything is optional; links.ts owns the defaults
export const env = import.meta.env as ImportMetaEnv & LandingEnv;
