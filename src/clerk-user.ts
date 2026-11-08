// Backend API lookups for data the Telegram webhook needs but Clerk's session helpers don't
// expose. Requests carry no Clerk session, so they use the secret key instead (see billing.ts)
type ClerkUser = {
  primary_email_address_id?: string | null;
  email_addresses?: { id: string; email_address: string }[];
};

// The address Clerk treats as primary, falling back to the first one on the account. Null when the
// user has no email or no longer exists, so callers can answer with the rest of their account
export const getUserEmail = async (clerkUserId: string): Promise<string | null> => {
  const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`User lookup failed: ${res.status} ${await res.text()}`);
  }
  const user = (await res.json()) as ClerkUser;
  const addresses = user.email_addresses ?? [];
  return (
    addresses.find((address) => address.id === user.primary_email_address_id)?.email_address ??
    addresses[0]?.email_address ??
    null
  );
};
