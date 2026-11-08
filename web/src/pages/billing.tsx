import { useEffect, useState } from "react";
import { ArrowUpRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, InlineError, PageHeader, Panel } from "@/components/ui-kit";
import { api, errorMessage, type Billing } from "@/lib/api";

const FREE_FEATURES = [
  "Reminders, channels and settings",
  "Up to 50 active reminders",
  "Pause, edit and reschedule any series",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Chat with the assistant on Telegram or iMessage",
  "Web browsing and a cloud computer",
];

export function BillingPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .billing()
      .then((plan) => {
        if (alive) {
          setBilling(plan);
          setError(null);
        }
      })
      .catch((reason) => {
        if (alive) setError(errorMessage(reason));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const pro = billing?.pro ?? null;
  const portalUrl = billing?.portalUrl ?? null;

  return (
    <div className="reveal flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Your plan, your reminder quota, and where to change either. Payment and invoices live in the Clerk billing portal."
      />

      <InlineError message={error} />

      <Panel className="relative overflow-hidden p-5 md:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle, var(--halo-strong) 0%, var(--halo-soft) 45%, transparent 72%)",
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <Eyebrow>Current plan</Eyebrow>
            {loading ? (
              <Skeleton className="mt-3 h-7 w-24 rounded-[6px]" />
            ) : (
              <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.025em] text-ink">
                {pro === null ? "Unavailable" : pro ? "Pro" : "Free"}
              </p>
            )}
            <p className="mt-3 max-w-[48ch] text-[13px] leading-[1.6] text-graphite">
              {pro
                ? "Chat, reminders and every linked channel are unlocked."
                : pro === null
                  ? "We couldn't reach billing just now. You can still open the portal to check your plan."
                  : "This dashboard works on Free. Chatting with the assistant needs Pro."}
            </p>
          </div>

          {portalUrl ? (
            <Button render={<a href={portalUrl} target="_blank" rel="noreferrer" />}>
              Open billing portal
              <ArrowUpRightIcon />
            </Button>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="flex flex-col p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold tracking-[-0.015em] text-ink">Free</p>
            {pro === false ? (
              <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-graphite">
            The web dashboard, without chat.
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-[12.5px] text-graphite">
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ash" />
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-6 text-[11px] uppercase tracking-[0.04em] text-ash">
            No payment
          </p>
        </Panel>

        <Panel
          className={
            pro
              ? "flex flex-col p-5 md:p-6 ring-1 ring-brand/35"
              : "flex flex-col p-5 md:p-6"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold tracking-[-0.015em] text-ink">Pro</p>
            {pro ? (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-graphite">
            Chat with your assistant, from any linked channel.
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-[12.5px] text-graphite">
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-brand" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            {portalUrl ? (
              <Button
                className="w-full"
                variant={pro ? "outline" : "default"}
                render={<a href={portalUrl} target="_blank" rel="noreferrer" />}
              >
                {pro ? "Manage plan" : "Upgrade to Pro"}
                <ArrowUpRightIcon />
              </Button>
            ) : (
              <Button className="w-full" disabled>
                Billing unavailable
              </Button>
            )}
          </div>
        </Panel>
      </div>

      <p className="text-[11.5px] leading-[1.6] text-ash">
        Plan changes, receipts and cancellation are handled by Clerk Billing. The assistant
        checks your plan when you message it, so a change can take a moment to apply in chat.
      </p>
    </div>
  );
}
