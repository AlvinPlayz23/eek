import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// The web session is the app's own signed cookie, not a Clerk session: the browser never sees a
// Clerk token, and the cookie only carries the Clerk user id the rest of the app already uses

export const SESSION_COOKIE = "pa_session";
export const DEVICE_COOKIE = "pa_device";
export const SESSION_DAYS = 30;

export type DashboardSession = {
  sub: string;
  email?: string;
  exp: number;
};

let cachedKey: Buffer | null = null;

// Separate from Clerk's own keys on purpose: rotating a Clerk secret should not silently change the
// format of every dashboard session, and this key is only ever used for this one job
const sessionKey = () => {
  if (cachedKey) return cachedKey;
  const secret = process.env.CLERK_SECRET_KEY ?? "local-development-secret";
  const derived = hkdfSync(
    "sha256",
    Buffer.from(secret),
    Buffer.from("personal-assistant"),
    Buffer.from("dashboard-session"),
    32
  );
  cachedKey = Buffer.from(derived);
  return cachedKey;
};

const sign = (body: string) =>
  createHmac("sha256", sessionKey()).update(body).digest("base64url");

export const createSessionToken = (sub: string, email?: string): string => {
  const payload: DashboardSession = {
    sub,
    ...(email ? { email } : {}),
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
};

export const verifySessionToken = (token: string): DashboardSession | null => {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const body = token.slice(0, separator);
  const received = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(sign(body));
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString()) as DashboardSession;
    if (!session.sub || typeof session.exp !== "number") return null;
    if (session.exp * 1000 <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
};

const secureCookies = () => process.env.NODE_ENV === "production";

export const setSessionCookie = (c: Context, token: string) =>
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: secureCookies(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

export const clearSessionCookie = (c: Context) => deleteCookie(c, SESSION_COOKIE, { path: "/" });

export const setDeviceCookie = (c: Context, deviceCode: string, maxAge: number) =>
  setCookie(c, DEVICE_COOKIE, deviceCode, {
    httpOnly: true,
    sameSite: "Lax",
    secure: secureCookies(),
    path: "/api/dashboard",
    maxAge,
  });

export const getDeviceCookie = (c: Context) => getCookie(c, DEVICE_COOKIE);

export const clearDeviceCookie = (c: Context) =>
  deleteCookie(c, DEVICE_COOKIE, { path: "/api/dashboard" });

export const readSession = (c: Context): DashboardSession | null => {
  const token = getCookie(c, SESSION_COOKIE);
  return token ? verifySessionToken(token) : null;
};
