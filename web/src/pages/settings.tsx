import { useCallback, useEffect, useState } from "react";
import { LogOutIcon, MessageCircleIcon, SendIcon, Trash2Icon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Field,
  InlineError,
  NativeSelect,
  PageHeader,
  Panel,
  SectionTitle,
} from "@/components/ui-kit";
import {
  api,
  errorMessage,
  type DashboardChannel,
  type SettingsResponse,
} from "@/lib/api";
import {
  browserTimeZone,
  linkedOn,
  maskHandle,
  platformName,
  timeZones,
} from "@/lib/format";

export function SettingsPage({
  onSignOut,
  onSignedOut,
}: {
  onSignOut: () => void;
  onSignedOut: () => void;
}) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [zone, setZone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingZone, setSavingZone] = useState(false);
  const [savedZone, setSavedZone] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<DashboardChannel | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await api.settings();
      setData(settings);
      setZone(settings.timezone ?? browserTimeZone());
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveZone = async () => {
    setSavingZone(true);
    setError(null);
    try {
      await api.setTimezone(zone);
      setData((current) => (current ? { ...current, timezone: zone } : current));
      setSavedZone(true);
      window.setTimeout(() => setSavedZone(false), 2000);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSavingZone(false);
    }
  };

  const unlink = async () => {
    if (!unlinkTarget) return;
    setBusy(true);
    try {
      await api.unlinkChannel(unlinkTarget.id);
      setUnlinkTarget(null);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const removeEverything = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteData();
      onSignedOut();
    } catch (reason) {
      setError(errorMessage(reason));
      setDeleting(false);
    }
  };

  const zoneChanged = Boolean(data) && zone !== (data?.timezone ?? "");

  return (
    <div className="reveal flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Your timezone, the channels the assistant can reach, and the account behind all of it."
      />

      <InlineError message={error} />

      <div className="flex flex-col gap-4">
        <Panel className="p-5 md:p-6">
          <SectionTitle title="Account" />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-ink">
                {loading ? "Loading…" : (data?.email ?? "No email on this account")}
              </p>
              <p className="mt-1 text-[11.5px] text-graphite">
                Signed in with Clerk. Signing out only affects this browser.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOutIcon />
              Sign out
            </Button>
          </div>
        </Panel>

        <Panel className="p-5 md:p-6">
          <SectionTitle title="Timezone" />
          <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.55] text-graphite">
            New reminders are scheduled in this zone. A reminder keeps the timezone it was
            created in, even after you change this.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Your timezone" className="min-w-[220px] flex-1">
              <NativeSelect
                value={zone}
                disabled={loading}
                onChange={(event) => setZone(event.target.value)}
              >
                {timeZones().map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button
              size="sm"
              className="h-9"
              loading={savingZone}
              disabled={!zoneChanged}
              onClick={() => void saveZone()}
            >
              {savedZone ? "Saved" : "Save timezone"}
            </Button>
          </div>
        </Panel>

        <Panel className="p-5 md:p-6">
          <SectionTitle title="Linked channels" />
          <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.55] text-graphite">
            The assistant only answers on a channel linked to your account. A channel also
            needs one message from you before reminders can be delivered there.
          </p>

          {loading && !data ? (
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-11 rounded-[8px]" />
              <Skeleton className="h-11 rounded-[8px]" />
            </div>
          ) : data && data.channels.length > 0 ? (
            <ul className="mt-4 divide-y divide-hairline/70">
              {data.channels.map((channel) => (
                <li
                  key={channel.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-mist text-graphite">
                    {channel.platform === "telegram" ? (
                      <SendIcon className="size-4" />
                    ) : (
                      <MessageCircleIcon className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-ink">
                      {platformName(channel.platform)}
                      <span
                        className={
                          channel.ready
                            ? "rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success-foreground"
                            : "rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite"
                        }
                      >
                        {channel.ready ? "Ready" : "Message first"}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-ash">
                      {maskHandle(channel.handle, channel.platform)} · linked{" "}
                      {linkedOn(channel.linkedAt)}
                    </p>
                  </div>
                  <Button
                    variant="destructive-outline"
                    size="sm"
                    onClick={() => setUnlinkTarget(channel)}
                  >
                    Unlink
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-[8px] bg-fog px-3 py-3 text-[12px] leading-[1.55] text-graphite">
              No channels linked. Message the assistant on Telegram and follow the sign-in
              link to connect one.
            </p>
          )}
        </Panel>

        <Panel className="p-5 md:p-6 ring-1 ring-destructive/20">
          <SectionTitle
            title={<span className="text-destructive-foreground">Delete data</span>}
          />
          <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.55] text-graphite">
            Removes your reminders, chat history, linked channels, timezone and dashboard
            session. The Clerk account itself stays; you'd have to link a channel again.
          </p>
          <Button
            variant="destructive-outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setConfirmText("");
              setDeleteOpen(true);
            }}
          >
            <Trash2Icon />
            Delete my data
          </Button>
        </Panel>
      </div>

      <AlertDialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink {unlinkTarget ? platformName(unlinkTarget.platform) : "channel"}?</AlertDialogTitle>
            <AlertDialogDescription>
              The assistant stops answering there, and future reminders to this channel will
              fail. You can link it again by messaging the assistant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              Keep it linked
            </AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              loading={busy}
              onClick={() => void unlink()}
            >
              Unlink
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Type <span className="text-ink">delete</span> to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Field label="Confirmation">
              <Input
                value={confirmText}
                autoComplete="off"
                placeholder="delete"
                onChange={(event) => setConfirmText(event.target.value)}
              />
            </Field>
          </div>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              loading={deleting}
              disabled={confirmText !== "delete"}
              onClick={() => void removeEverything()}
            >
              Delete my data
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
