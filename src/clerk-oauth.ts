// Calls to the Clerk OAuth application that links chat accounts (and signs users in to the web
// dashboard). The application uses the Device Authorization Grant, so no redirect URI is needed:
// the user signs in on Clerk's page and the app polls until the browser approves the code.

export type DeviceAuthorization = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
};

export type TokenResponse = { access_token: string } | { error: string; error_description?: string };

const oauthRequest = (path: string, body: Record<string, string>) =>
  fetch(`${process.env.CLERK_OAUTH_ISSUER}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${process.env.CLERK_OAUTH_CLIENT_ID}:${process.env.CLERK_OAUTH_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });

export const startDeviceAuthorization = async (): Promise<DeviceAuthorization> => {
  const res = await oauthRequest("/oauth/device_authorization", {
    client_id: process.env.CLERK_OAUTH_CLIENT_ID!,
    scope: "openid email",
  });
  if (!res.ok) {
    throw new Error(`Device authorization failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as DeviceAuthorization;
};

export const pollToken = async (deviceCode: string): Promise<TokenResponse> => {
  const res = await oauthRequest("/oauth/token", {
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    device_code: deviceCode,
  });
  // Pending, denied and expired requests come back as 400s with an OAuth error code
  if (!res.ok && res.status !== 400) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
};

export const fetchUserInfo = async (accessToken: string) => {
  const res = await fetch(`${process.env.CLERK_OAUTH_ISSUER}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed: ${res.status} ${await res.text()}`);
  }
  // `sub` is the Clerk user id
  return (await res.json()) as { sub: string; email?: string };
};
