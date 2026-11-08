import { useEffect, useState } from "react";
import {
  BellRingIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  PlusIcon,
  SendIcon,
  MessageCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  Eyebrow,
  InlineError,
  PageHeader,
  Panel,
  PlatformTag,
  QuotaBar,
  SectionTitle,
} from "@/components/ui-kit";
import { api, errorMessage, type Billing, type Overview } from "@/lib/api";
import {
  linkedOn,
  localNowLabel,
  maskHandle,
  platformName,
  relativeTime,
  shortDate,
  shortTime,
} from "@/lib/format";

export function OverviewPage({ onNewReminder }: { onNewReminder: () => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.overview(), api.billing().catch(() => null)])
      .then(([overview, plan]) => {
        if (!alive) return;
        setData(overview);
        setBilling(plan);
        setError(null);
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const next = data?.reminders[0] ?? null;
  const portalUrl = billing?.portalUrl ?? null;

  return (
    <div className="reveal flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description={localNowLabel(data?.timezone, now)}
        actions={
          <Button onClick={onNewReminder}>
            <PlusIcon />
            New reminder
          </Button>
        }
      />

      <InlineError message={error} />

      {loading && !data ? <OverviewSkeleton /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-12 gap-4">
            <Panel className="relative col-span-12 overflow-hidden p-5 md:col-span-7 md:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, var(--halo-strong) 0%, var(--halo-soft) 45%, transparent 72%)",
                }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <Eyebrow>Next reminder</Eyebrow>
                {next ? <PlatformTag platform={next.platform} /> : null}
              </div>

              {next ? (
                <div className="relative mt-5">
                  <p className="text-[22px] leading-none text-brand sm:text-[26px]">
                    {shortTime(next.dueAt, next.timezone)}
                  </p>
                  <p className="mt-1 text-[11px] text-ash">
                    {shortDate(next.dueAt, next.timezone)}
                  </p>
                  <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.45] text-ink sm:text-[17px]">
                    {next.text}
                  </p>
                  {next.repeat || data.timezone === null || next.timezone !== data.timezone ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {next.repeat ? (
                        <span className="inline-flex items-center rounded-full bg-mist px-2 py-0.5 text-[11px] text-graphite">
                          {next.repeat}
                        </span>
                      ) : null}
                      {data.timezone === null || next.timezone !== data.timezone ? (
                        <span className="text-[11px] text-ash">{next.timezone}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="relative mt-4">
                  <p className="text-[19px] font-medium leading-[1.3] text-ink">
                    Nothing scheduled.
                  </p>
                  <p className="mt-2 max-w-[40ch] text-[13px] leading-[1.6] text-graphite">
                    Create one here, or just ask the assistant in chat.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-5"
                    onClick={onNewReminder}
                  >
                    <PlusIcon />
                    Create the first one
                  </Button>
                </div>
              )}

              <a
                href="#/reminders"
                className="relative mt-6 inline-flex items-center gap-1 rounded-[6px] text-[12px] text-graphite outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
              >
                View all reminders
                <ChevronRightIcon className="size-3.5" />
              </a>
            </Panel>

            <Panel className="col-span-12 flex flex-col p-5 md:col-span-5 md:p-6">
              <SectionTitle
                title="Plan"
                action={
                  <span
                    className={
                      data.pro
                        ? "inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand"
                        : "inline-flex items-center rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite"
                    }
                  >
                    {data.pro === null ? "Unavailable" : data.pro ? "Pro" : "Free"}
                  </span>
                }
              />
              <p className="mt-4 text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink">
                {data.pro === null ? "—" : data.pro ? "Pro" : "Free"}
              </p>
              <p className="mt-2 text-[12.5px] leading-[1.55] text-graphite">
                {data.pro === null
                  ? "We couldn't reach billing just now. The portal still works."
                  : data.pro
                    ? "Chat, reminders and your linked channels are unlocked."
                    : "The dashboard is yours. Chatting with the assistant needs Pro."}
              </p>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-graphite">Active reminders</span>
                  <span className="text-[11px] text-ash">{data.quota.limit} max</span>
                </div>
                <QuotaBar used={data.quota.used} limit={data.quota.limit} />
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                {portalUrl ? (
                  <Button
                    size="sm"
                    variant={data.pro ? "outline" : "default"}
                    render={<a href={portalUrl} target="_blank" rel="noreferrer" />}
                  >
                    {data.pro ? "Manage plan" : "Upgrade to Pro"}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" render={<a href="#/billing" />}>
                  Billing details
                </Button>
              </div>
            </Panel>

            <Panel className="col-span-12 p-5 md:col-span-4 md:p-6">
              <SectionTitle
                title="Linked channels"
                action={
                  <a
                    href="#/settings"
                    className="rounded-[6px] text-[11.5px] text-graphite outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Manage
                  </a>
                }
              />
              {data.channels.length === 0 ? (
                <p className="mt-4 text-[12.5px] leading-[1.6] text-graphite">
                  No channel linked yet. Message the assistant on Telegram and follow the
                  sign-in link.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {data.channels.map((channel) => (
                    <li key={channel.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] bg-mist text-graphite">
                        {channel.platform === "telegram" ? (
                          <SendIcon className="size-3.5" />
                        ) : (
                          <MessageCircleIcon className="size-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink">
                          {platformName(channel.platform)}
                        </p>
                        <p className="truncate text-[11px] text-ash">
                          {maskHandle(channel.handle, channel.platform)} · linked{" "}
                          {linkedOn(channel.linkedAt)}
                        </p>
                      </div>
                      <span
                        className={
                          channel.ready
                            ? "mt-0.5 shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success-foreground"
                            : "mt-0.5 shrink-0 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite"
                        }
                      >
                        {channel.ready ? "Ready" : "Message first"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="col-span-12 p-5 md:col-span-4 md:p-6">
              <SectionTitle title="Reminders" />
              <div className="mt-4 grid grid-cols-3 divide-x divide-hairline/70">
                {[
                  { label: "Upcoming", value: data.counts.upcoming },
                  { label: "Paused", value: data.counts.paused },
                  { label: "Past", value: data.counts.past },
                ].map((stat, index) => (
                  <div key={stat.label} className={index === 0 ? "pr-3" : "px-3"}>
                    <p className="text-[20px] leading-none tabular-nums text-ink">
                      {stat.value}
                    </p>
                    <p className="mt-1.5 text-[11px] uppercase tracking-[0.04em] text-ash">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <a
                href="#/reminders"
                className="mt-4 inline-flex items-center gap-1 rounded-[6px] text-[11.5px] text-graphite outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
              >
                Open reminders
                <ChevronRightIcon className="size-3" />
              </a>
            </Panel>

            <Panel className="col-span-12 p-5 md:col-span-4 md:p-6">
              <SectionTitle
                title="Timezone"
                action={
                  <a
                    href="#/settings"
                    className="rounded-[6px] text-[11.5px] text-graphite outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Change
                  </a>
                }
              />
              <p className="mt-4 truncate text-[13px] text-ink">
                {data.timezone ?? "Not set"}
              </p>
              <p className="mt-2 text-[11.5px] leading-[1.5] text-graphite">
                {data.timezone
                  ? "New reminders use this zone. Existing ones keep theirs."
                  : "Set a timezone so reminders land at the right hour."}
              </p>
            </Panel>

            <Panel className="col-span-12 md:col-span-7">
              <div className="p-5 md:p-6">
                <SectionTitle
                  title="Coming up"
                  action={
                    <a
                      href="#/reminders"
                      className="rounded-[6px] text-[11.5px] text-graphite outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      All
                    </a>
                  }
                />
              </div>
              {data.reminders.length === 0 ? (
                <div className="border-t border-hairline/70">
                  <EmptyState
                    icon={<BellRingIcon className="size-4" />}
                    title="No reminders scheduled"
                    description="Ask the assistant, or add one here."
                    action={
                      <Button size="sm" variant="outline" onClick={onNewReminder}>
                        <PlusIcon />
                        New reminder
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-hairline/70 border-t border-hairline/70">
                  {data.reminders.map((reminder, index) => (
                    <li
                      key={reminder.id}
                      className="row-reveal flex items-start gap-4 px-5 py-3.5 md:px-6"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="w-[78px] shrink-0 text-[11px] tabular-nums leading-[1.7]">
                        <div className="text-ink">{shortDate(reminder.dueAt, reminder.timezone)}</div>
                        <div className="text-ash">{shortTime(reminder.dueAt, reminder.timezone)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] leading-[1.5] text-ink">
                          {reminder.text}
                        </p>
                        {reminder.repeat ? (
                          <p className="mt-0.5 truncate text-[11px] text-ash">{reminder.repeat}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="col-span-12 md:col-span-5">
              <div className="p-5 md:p-6">
                <SectionTitle title="Recent activity" />
              </div>
              {data.activity.length === 0 ? (
                <div className="border-t border-hairline/70">
                  <EmptyState
                    icon={<MessageSquareIcon className="size-4" />}
                    title="Nothing yet"
                    description="Messages and delivered reminders show up here."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-hairline/70 border-t border-hairline/70">
                  {data.activity.map((item, index) => (
                    <li
                      key={`${item.kind}-${item.id}`}
                      className="row-reveal flex items-start gap-3 px-5 py-3 md:px-6"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-mist text-graphite">
                        {item.kind === "reminder" ? (
                          <BellRingIcon className="size-3" />
                        ) : (
                          <MessageSquareIcon className="size-3" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[12.5px] leading-[1.45] text-ink">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ash">
                          {platformName(item.platform)} · {relativeTime(item.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <a
            href="#/billing"
            className="raised group flex items-center justify-between gap-4 rounded-[12px] px-4 py-3 outline-none transition-shadow hover:shadow-[var(--panel-shadow)] focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="text-[12px] text-graphite">
              {data.pro
                ? "Your Pro plan is billed through Clerk."
                : "Pro unlocks chat with the assistant."}
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink">
              {data.pro ? "Manage billing" : "See plans"}
              <ChevronRightIcon className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </a>
        </>
      ) : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Skeleton className="col-span-12 h-[230px] rounded-[16px] md:col-span-7" />
      <Skeleton className="col-span-12 h-[230px] rounded-[16px] md:col-span-5" />
      <Skeleton className="col-span-12 h-[150px] rounded-[16px] md:col-span-4" />
      <Skeleton className="col-span-12 h-[150px] rounded-[16px] md:col-span-4" />
      <Skeleton className="col-span-12 h-[150px] rounded-[16px] md:col-span-4" />
    </div>
  );
}
