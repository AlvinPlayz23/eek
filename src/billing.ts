// The paid user plan in Clerk Billing (Dashboard → Billing → Plans → User Plans)
export const PRO_PLAN_SLUG = "pro";

// A failed Clerk lookup. The status and Clerk's error code are safe to log; the body is not
export class BillingLookupError extends Error {
  override name = "BillingLookupError";
  constructor(
    readonly status: number,
    readonly clerkCode: string | undefined,
    body: string
  ) {
    super(`Subscription lookup failed: ${status} ${body}`);
  }
}

type SubscriptionItem = { status: string; plan: { slug: string } };
type Subscription = { subscription_items: SubscriptionItem[] };

// Webhook requests carry no Clerk session, so `has({ plan })` isn't available; the plan is read
// from the Backend API by the Clerk user id the chat account is linked to instead
export const hasProPlan = async (clerkUserId: string) => {
  const res = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}/billing/subscription`,
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
  );
  // No subscription at all, e.g. a user created before Billing was enabled
  if (res.status === 404) return false;
  if (!res.ok) {
    const body = await res.text();
    let clerkCode: string | undefined;
    try {
      clerkCode = (JSON.parse(body) as { errors?: { code?: string }[] }).errors?.[0]?.code;
    } catch {
      // not JSON
    }
    throw new BillingLookupError(res.status, clerkCode, body);
  }
  const subscription = (await res.json()) as Subscription;
  // A canceled Pro item stays `active` until its period ends; upcoming (scheduled) items don't count
  return subscription.subscription_items.some(
    (item) => item.plan.slug === PRO_PLAN_SLUG && item.status === "active"
  );
};

// The hosted Account Portal lives next to the Frontend API, whose host is encoded in the
// publishable key: `<slug>.clerk.accounts.dev` → `<slug>.accounts.dev` in development,
// `clerk.<domain>` → `accounts.<domain>` in production
const accountPortalUrl = () => {
  const key = process.env.CLERK_PUBLISHABLE_KEY!;
  const frontendApi = Buffer.from(key.split("_")[2], "base64").toString().replace(/\$$/, "");
  const host = frontendApi.endsWith(".clerk.accounts.dev")
    ? frontendApi.replace(/\.clerk\.accounts\.dev$/, ".accounts.dev")
    : frontendApi.replace(/^clerk\./, "accounts.");
  return `https://${host}`;
};

// The Billing tab of the Account Portal's user profile, where users can subscribe
export const upgradeUrl = () => `${accountPortalUrl()}/user/billing`;
