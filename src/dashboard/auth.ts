import { Hono } from "hono";
import { fetchUserInfo, pollToken, startDeviceAuthorization } from "../clerk-oauth.js";
import { log } from "../log.js";
import {
  clearDeviceCookie,
  clearSessionCookie,
  createSessionToken,
  getDeviceCookie,
  readSession,
  setDeviceCookie,
  setSessionCookie,
} from "./session.js";

// Sign-in is the same Clerk device flow that links a chat account (see inngest/link-account.ts):
// start a code, show the user where to approve it, and poll until they do. It needs no redirect URI
// and no extra Clerk configuration, and it signs the browser into the same user the assistant knows

const device = new Hono();

device.post("/start", async (c) => {
  try {
    const authorization = await startDeviceAuthorization();
    setDeviceCookie(c, authorization.device_code, authorization.expires_in);
    return c.json({
      userCode: authorization.user_code,
      verificationUri: authorization.verification_uri,
      verificationUriComplete: authorization.verification_uri_complete,
      expiresIn: authorization.expires_in,
      interval: Math.max(authorization.interval, 5),
    });
  } catch (error) {
    log.error("Dashboard sign-in could not start", {
      "error.name": error instanceof Error ? error.name : "unknown",
    });
    return c.json({ error: "Sign-in is unavailable right now." }, 502);
  }
});

device.post("/poll", async (c) => {
  const deviceCode = getDeviceCookie(c);
  // A missing cookie is an expected expiry, not an API failure: the client should offer a fresh
  // code instead of surfacing an error and polling again.
  if (!deviceCode) return c.json({ status: "expired" as const });

  let token;
  try {
    token = await pollToken(deviceCode);
  } catch (error) {
    log.error("Dashboard sign-in poll failed", {
      "error.name": error instanceof Error ? error.name : "unknown",
    });
    return c.json({ error: "Sign-in is unavailable right now." }, 502);
  }

  if ("access_token" in token) {
    try {
      const user = await fetchUserInfo(token.access_token);
      clearDeviceCookie(c);
      setSessionCookie(c, createSessionToken(user.sub, user.email));
      return c.json({ status: "linked" as const, email: user.email ?? null });
    } catch (error) {
      log.error("Dashboard sign-in could not read the user", {
        "error.name": error instanceof Error ? error.name : "unknown",
      });
      return c.json({ error: "Sign-in failed. Try again." }, 502);
    }
  }

  switch (token.error) {
    case "authorization_pending":
      return c.json({ status: "pending" as const });
    case "slow_down":
      return c.json({ status: "slow_down" as const });
    case "access_denied":
      clearDeviceCookie(c);
      return c.json({ status: "denied" as const });
    case "expired_token":
      clearDeviceCookie(c);
      return c.json({ status: "expired" as const });
    default:
      log.warn("Dashboard sign-in returned an unexpected error", { "oauth.error": token.error });
      return c.json({ error: "Sign-in failed. Try again." }, 502);
  }
});

const auth = new Hono();

// A signed-in user gets a page that says they are signed in; signing out also clears the device
// code of a flow that was left half-finished
auth.post("/sign-out", (c) => {
  clearSessionCookie(c);
  clearDeviceCookie(c);
  return c.body(null, 204);
});

auth.get("/me", (c) => {
  const session = readSession(c);
  if (!session) return c.json({ error: "Not signed in." }, 401);
  return c.json({ user: { email: session.email ?? null }, expiresAt: session.exp * 1000 });
});

auth.route("/", device);

export { auth };
