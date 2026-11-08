import { env } from "./env";

// Public entry points. Any of them can be overridden per deployment with VITE_* variables
export const TELEGRAM_URL = env.VITE_TELEGRAM_URL ?? "https://t.me/eek_aibot";

// In the landing dev server the dashboard isn't mounted, so point at the API server instead
const defaultDashboard = import.meta.env.DEV ? "http://localhost:3000/dashboard/" : "/dashboard/";
const dashboard = env.VITE_DASHBOARD_URL ?? defaultDashboard;
export const DASHBOARD_URL = dashboard.endsWith("/") ? dashboard : `${dashboard}/`;
export const BILLING_URL = `${DASHBOARD_URL}#/billing`;
export const SITE_URL = env.VITE_SITE_URL ?? "";
