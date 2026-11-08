import { useCallback, useEffect, useState } from "react";
import {
  BellOffIcon,
  BellRingIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { ReminderDialog } from "@/components/reminder-dialog";
import {
  EmptyState,
  InlineError,
  PageHeader,
  Panel,
  PlatformTag,
  QuotaBar,
  StatusPill,
} from "@/components/ui-kit";
import {
  api,
  errorMessage,
  type Reminder,
  type RemindersResponse,
  type SettingsResponse,
} from "@/lib/api";
import { shortDate, shortTime } from "@/lib/format";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "paused", label: "Paused" },
  { id: "past", label: "Past" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const EMPTY_COPY: Record<Tab, { title: string; body: string }> = {
  upcoming: {
    title: "Nothing coming up",
    body: "One-offs and repeating series you create show up here.",
  },
  paused: {
    title: "No paused reminders",
    body: "Pause a reminder to keep it without delivering it.",
  },
  past: {
    title: "Nothing in the past yet",
    body: "Sent, canceled and failed reminders collect here.",
  },
};

export function RemindersPage({
  openNew,
  onNewHandled,
}: {
  openNew: boolean;
  onNewHandled: () => void;
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [config, setConfig] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reminder | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (which: Tab) => {
    setLoading(true);
    try {
      const [list, settings] = await Promise.all([api.reminders(which), api.settings()]);
      setData(list);
      setConfig(settings);
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  useEffect(() => {
    if (!openNew) return;
    setEditing(null);
    setDialogOpen(true);
    onNewHandled();
  }, [onNewHandled, openNew]);

  const act = async (reminder: Reminder, action: "pause" | "resume") => {
    setBusy(`${reminder.id}:${action}`);
    try {
      await (action === "pause"
        ? api.pauseReminder(reminder.id)
        : api.resumeReminder(reminder.id));
      await load(tab);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setBusy(`${cancelTarget.id}:cancel`);
    try {
      await api.cancelReminder(cancelTarget.id);
      setCancelTarget(null);
      await load(tab);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const counts = data?.counts ?? { upcoming: 0, paused: 0, past: 0 };
  const quota = data?.quota ?? { used: 0, limit: 50 };

  return (
    <div className="reveal flex flex-col gap-6">
      <PageHeader
        title="Reminders"
        description="One-offs and repeating series, shown in the timezone they were created in."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <PlusIcon />
            New reminder
          </Button>
        }
      />

      <InlineError message={error} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as Tab)}
            className="min-w-0"
          >
            <TabsList className="max-w-full overflow-x-auto">
              {TABS.map((entry) => (
                <TabsTab key={entry.id} value={entry.id}>
                  {entry.label}
                  <span className="ms-1.5 text-[11px] text-ash">
                    {counts[entry.id]}
                  </span>
                </TabsTab>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-[11px] text-ash">
            {quota.used}/{quota.limit} active
          </p>
        </div>

        <div className="max-w-[280px]">
          <QuotaBar used={quota.used} limit={quota.limit} />
        </div>

        <Panel className="overflow-hidden">
          {loading && !data ? (
            <div className="flex flex-col gap-4 p-5 md:p-6">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-start gap-4">
                  <Skeleton className="h-9 w-[78px] rounded-[6px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3 rounded-[6px]" />
                    <Skeleton className="h-3 w-1/3 rounded-[6px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : data && data.reminders.length > 0 ? (
            <ul className="divide-y divide-hairline/70">
              {data.reminders.map((reminder, index) => (
                <li
                  key={reminder.id}
                  className="row-reveal grid grid-cols-[76px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-4 sm:flex sm:gap-4 sm:px-5 md:px-6"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <div className="col-start-1 row-start-1 w-[76px] shrink-0 pt-0.5 text-[11px] tabular-nums leading-[1.7] sm:w-[86px]">
                    <div className="text-ink">
                      {tab === "past"
                        ? shortDate(reminder.lastSentAt ?? reminder.dueAt, reminder.timezone)
                        : shortDate(reminder.dueAt, reminder.timezone)}
                    </div>
                    <div className="text-ash">
                      {tab === "past"
                        ? reminder.lastSentAt
                          ? shortTime(reminder.lastSentAt, reminder.timezone)
                          : "—"
                        : shortTime(reminder.dueAt, reminder.timezone)}
                    </div>
                  </div>

                  <div className="col-start-2 row-start-1 min-w-0 sm:flex-1">
                    <p className="text-[13.5px] leading-[1.5] text-ink">{reminder.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <PlatformTag platform={reminder.platform} />
                      {reminder.repeat ? (
                        <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-graphite">
                          {reminder.repeat}
                        </span>
                      ) : null}
                      {reminder.status === "paused" ? <StatusPill reminder={reminder} /> : null}
                      {tab === "past" ? <StatusPill reminder={reminder} /> : null}
                      {!config?.timezone || reminder.timezone !== config.timezone ? (
                        <span className="text-[11px] text-ash">{reminder.timezone}</span>
                      ) : null}
                    </div>
                  </div>

                  {tab !== "past" ? (
                    <div className="col-start-2 row-start-2 flex shrink-0 items-center gap-0.5 sm:col-auto sm:row-auto sm:ml-auto">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit reminder"
                        onClick={() => {
                          setEditing(reminder);
                          setDialogOpen(true);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      {reminder.status === "paused" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Resume reminder"
                          loading={busy === `${reminder.id}:resume`}
                          onClick={() => void act(reminder, "resume")}
                        >
                          <PlayIcon />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Pause reminder"
                          loading={busy === `${reminder.id}:pause`}
                          onClick={() => void act(reminder, "pause")}
                        >
                          <PauseIcon />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Cancel reminder"
                        className="text-graphite hover:text-destructive-foreground"
                        onClick={() => setCancelTarget(reminder)}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={
                tab === "past" ? (
                  <BellOffIcon className="size-4" />
                ) : (
                  <BellRingIcon className="size-4" />
                )
              }
              title={EMPTY_COPY[tab].title}
              description={EMPTY_COPY[tab].body}
              action={
                tab === "upcoming" ? (
                  <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                    <PlusIcon />
                    New reminder
                  </Button>
                ) : undefined
              }
            />
          )}
        </Panel>
      </div>

      <ReminderDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        channels={config?.channels ?? []}
        timezone={config?.timezone ?? null}
        onSaved={() => {
          const nextTab = editing?.status === "paused" ? "paused" : "upcoming";
          setDialogOpen(false);
          setEditing(null);
          if (nextTab === tab) {
            void load(nextTab);
          } else {
            setTab(nextTab);
          }
        }}
      />

      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              “{cancelTarget?.text}” will stop for good and move to Past. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              Keep it
            </AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              loading={busy === `${cancelTarget?.id}:cancel`}
              onClick={() => void confirmCancel()}
            >
              Cancel reminder
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
