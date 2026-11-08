import { Hono, type MiddlewareHandler } from "hono";
import { loadGmailConnection, deleteGmailConnection, saveGmailConnection } from "../db/gmail.js";
import { log } from "../log.js";
import { readSession, type DashboardSession } from "./session.js";

type Env = { Variables: { session: DashboardSession } };

const COMPOSIO_API = "https://backend.composio.dev/api/v3";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const requireSession: MiddlewareHandler<Env> = async (c, next) => {
  const session = readSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  c.set("session", session);
  await next();
};

const composioHeaders = () => {
  const raw = process.env.COMPOSIO_API_KEY;
  const key = raw?.trim();
  if (!key) throw new Error("Composio is not configured.");
  return { "x-api-key": key, "Content-Type": "application/json" };
};

const logConnectError = (error: unknown) => {
  log.error("Gmail connect start failed", {
    "error.name": error instanceof Error ? error.name : "unknown",
    "error.message": error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400),
    "error.cause": (!(error as { cause?: unknown } | null)?.cause)
      ? undefined
      : String((error as { cause?: unknown }).cause).slice(0, 400),
  });
};

// Best effort: fetch the display email for a Composio connected account (may be null)
const fetchAccountEmail = async (accountId: string): Promise<string | null> => {
  try {
    const res = await fetch(`${COMPOSIO_API}/connected_accounts/${encodeURIComponent(accountId)}`, {
      headers: composioHeaders(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const info = (data.data ?? data) as Record<string, unknown>;
    // Gmail's connected account exposes the address as displayName (e.g. in data.displayName),
    // with the older state.val.displayName shape still appearing for some toolkits.
    const state = (info.state ?? {}) as Record<string, unknown>;
    const val = (state.val ?? {}) as Record<string, unknown>;
    const email =
      (typeof info.displayName === "string" && info.displayName) ||
      (typeof info.email === "string" && info.email) ||
      (typeof info.emailAddress === "string" && info.emailAddress) ||
      (typeof val.displayName === "string" && val.displayName) ||
      (typeof val.email === "string" && val.email) ||
      null;
    return email;
  } catch {
    return null;
  }
};

const gmail = new Hono<Env>();

gmail.get("/status", requireSession, async (c) => {
  const session = c.get("session");
  const conn = await loadGmailConnection(session.sub);
  return c.json({ connected: Boolean(conn), email: conn?.email ?? null });
});

gmail.get("/connect", requireSession, async (c) => {
  const session = c.get("session");
  if (!process.env.COMPOSIO_API_KEY) return c.json({ error: "Gmail is not configured." }, 501);
  try {
    const url = new URL(c.req.url);
    const callbackUrl = `${url.protocol}//${url.host}/api/dashboard/gmail/connect/callback`;

    // 1. Find or create a managed OAuth auth config for Gmail (or reuse a provided id)
    let authConfigId = process.env.COMPOSIO_AUTH_CONFIG_ID ?? null;
    if (!authConfigId) {
      const listRes = await fetch(`${COMPOSIO_API}/auth_configs?toolkit_slug=gmail&limit=10`, {
        headers: composioHeaders(),
      });
      if (listRes.ok) {
        const list = (await listRes.json()) as { items?: Array<{ id?: string }> };
        authConfigId = list.items?.[0]?.id ?? null;
      }
      if (!authConfigId) {
        const createRes = await fetch(`${COMPOSIO_API}/auth_configs`, {
          method: "POST",
          headers: composioHeaders(),
          body: JSON.stringify({
            toolkit_slug: "gmail",
            auth_scheme: "OAUTH2",
            managed_auth: {
              callback_url: callbackUrl,
              auto_refresh_enabled: true,
            },
            scopes: [GMAIL_SCOPE],
          }),
        });
        const created = (await createRes.json().catch(() => null)) as { id?: string } | null;
        if (!createRes.ok || !created?.id) {
          const detail = created ? JSON.stringify(created).slice(0, 400) : "";
          throw new Error(`Could not create Gmail auth config (${createRes.status}): ${detail}`);
        }
        authConfigId = created.id;
      }
    }

    // 2. Create a connected account (triggers the hosted connect URL for this user)
    // v3 shape is nested: { auth_config: { id }, connection: { user_id, callback_url } }
    const res = await fetch(`${COMPOSIO_API}/connected_accounts`, {
      method: "POST",
      headers: composioHeaders(),
      body: JSON.stringify({
        auth_config: { id: authConfigId },
        connection: { user_id: session.sub, callback_url: callbackUrl },
      }),
    });
    const payloadText = await res.text();
    let payload: unknown = null;
    try { payload = JSON.parse(payloadText); } catch { payload = payloadText; }
    if (!res.ok) {
      const detail = (typeof payload === "string" ? payload : JSON.stringify(payload)).slice(0, 500);
      throw new Error(`Could not start Gmail connection (${res.status}): ${detail}`);
    }

    // Composio returns the redirect under different keys depending on version
    const obj = payload as Record<string, unknown>;
    const nested = (obj.connection_request ?? obj.data ?? obj) as Record<string, unknown>;
    const redirectUrl =
      (typeof nested.redirect_url === "string" && nested.redirect_url) ||
      (typeof nested.redirectUrl === "string" && nested.redirectUrl) ||
      (typeof obj.redirect_url === "string" && obj.redirect_url) ||
      (typeof obj.oauth_url === "string" && obj.oauth_url) ||
      (typeof nested.oauth_url === "string" && nested.oauth_url) ||
      null;

    if (redirectUrl) return c.redirect(redirectUrl);

    // Some versions return a connection id immediately (already connected)
    const accountId =
      (typeof obj.id === "string" && obj.id) || (typeof nested.id === "string" && nested.id) || null;
    if (accountId?.startsWith("ca_")) {
      await saveGmailConnection({
        clerkUserId: session.sub,
        composioAccountId: accountId,
        email: await fetchAccountEmail(accountId),
      });
      return c.redirect("/dashboard/#/connections?gmail=connected");
    }

    throw new Error("Composio did not return a connect URL.");
  } catch (error) {
    logConnectError(error);
    return c.json({ error: "Could not start Gmail connection. Try again." }, 502);
  }
});

// Composio redirects the browser here after the user approves in their hosted OAuth.
// Composio includes `connected_account_id` and (usually) `user_id` in the callback query.
// SameSite cookies may not survive the cross-site redirect, so we read the user from the
// query first and fall back to the dashboard session cookie if present.
gmail.get("/connect/callback", async (c) => {
  const accountId = c.req.query("connected_account_id") ?? c.req.query("connectedAccountId");
  const userId = c.req.query("user_id") ?? c.req.query("userId") ?? readSession(c)?.sub;
  const status = c.req.query("status") ?? "success";
  if (!accountId || !userId) return c.redirect("/dashboard/#/connections?gmail=error");
  if (status !== "success") return c.redirect("/dashboard/#/connections?gmail=error");
  try {
    await saveGmailConnection({
      clerkUserId: userId,
      composioAccountId: accountId,
      email: await fetchAccountEmail(accountId),
      status,
    });
    return c.redirect("/dashboard/#/connections?gmail=connected");
  } catch (error) {
    log.error("Gmail connect callback failed", {
      "error.name": error instanceof Error ? error.name : "unknown",
      "error.message": error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400),
    });
    return c.redirect("/dashboard/#/connections?gmail=error");
  }
});

gmail.post("/disconnect", requireSession, async (c) => {
  const session = c.get("session");
  const conn = await loadGmailConnection(session.sub).catch(() => null);
  if (conn && process.env.COMPOSIO_API_KEY) {
    // Best effort: revoke in Composio, always delete the local row
    await fetch(`${COMPOSIO_API}/connected_accounts/${encodeURIComponent(conn.composioAccountId)}`, {
      method: "DELETE",
      headers: composioHeaders(),
    }).catch(() => {});
  }
  await deleteGmailConnection(session.sub);
  return c.json({ ok: true });
});

export { gmail };
