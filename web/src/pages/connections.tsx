import { useCallback, useEffect, useState } from "react";
import {
  CalendarIcon,
  ExternalLinkIcon,
  HardDriveIcon,
  MailIcon,
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
import {
  InlineError,
  PageHeader,
  Panel,
  SectionTitle,
} from "@/components/ui-kit";
import { api, errorMessage, type GmailStatus } from "@/lib/api";

const COMING_SOON = [
  { name: "Google Calendar", icon: CalendarIcon, body: "Read your calendar and create events from chat." },
  { name: "Google Drive", icon: HardDriveIcon, body: "Find and summarize files the agent can open." },
] as const;

export function ConnectionsPage() {
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.gmailStatus().catch(() => ({ connected: false, email: null } as GmailStatus));
      setGmail(status);
      setError(null);
      const query = window.location.hash.split("?")[1] ?? "";
      const result = new URLSearchParams(query).get("gmail");
      if (result === "connected") setNotice("Gmail connected. You can now ask about your email in chat.");
      if (result === "error") setNotice("Gmail connection failed. Check your connection and try again.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.gmailDisconnect();
      setGmail({ connected: false, email: null });
      setDisconnectOpen(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="reveal flex flex-col gap-6">
      <PageHeader
        title="Connections"
        description="External services your assistant can use on your behalf. Gmail can read and draft mail, but only sends once you confirm the draft in chat."
      />

      <InlineError message={error} />

      <div className="flex flex-col gap-4">
        <Panel className="p-5 md:p-6">
          <SectionTitle
            title="Connected accounts"
            action={
              <span
                className={
                  gmail?.connected
                    ? "inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success-foreground"
                    : "inline-flex items-center rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite"
                }
              >
                {gmail?.connected ? "1 connected" : "None connected"}
              </span>
            }
          />
          <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.55] text-graphite">
            Connect a service once. The assistant will only touch it when you ask in chat.
          </p>
          {notice ? (
            <p className="mt-3 rounded-[8px] bg-fog px-3 py-2 text-[12px] text-graphite">{notice}</p>
          ) : null}

          {loading && !gmail ? (
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-14 rounded-[8px]" />
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[12px] bg-fog px-4 py-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-mist text-graphite">
                <MailIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-ink">
                  Gmail
                  <span
                    className={
                      gmail?.connected
                        ? "rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success-foreground"
                        : "rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite"
                    }
                  >
                    {gmail?.connected ? "Connected" : "Not connected"}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[12px] leading-[1.5] text-graphite">
                  {gmail?.connected
                    ? `Reading and drafting mail for ${gmail.email ?? "your inbox"}. Sends only after you confirm a draft in chat.`
                    : "Let the assistant search, read and draft email from chat. It sends only after you confirm a draft."}
                </p>
              </div>
              {gmail?.connected ? (
                <Button variant="outline" size="sm" onClick={() => setDisconnectOpen(true)}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={() => setConnectOpen(true)}>
                  Connect Gmail
                </Button>
              )}
            </div>
          )}
        </Panel>

        <Panel className="p-5 md:p-6">
          <SectionTitle title="Available" />
          <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.55] text-graphite">
            More integrations are coming. For now the assistant can use your computer sandbox
            and the web.
          </p>
          <ul className="mt-4 divide-y divide-hairline/70">
            {COMING_SOON.map((item) => (
              <li key={item.name} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-mist text-ash">
                  <item.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-graphite">{item.name}</p>
                  <p className="truncate text-[11.5px] text-ash">{item.body}</p>
                </div>
                <span className="shrink-0 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite">
                  Coming soon
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <AlertDialog
        open={connectOpen}
        onOpenChange={(open) => {
          if (!open) setConnectOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Connect Gmail?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be taken to an external page (Composio, then Google) to sign in and approve
              access. Your password stays with Google. The assistant can read and draft email, but
              it can only send a draft after you explicitly confirm it in chat — and you can
              disconnect anytime from this page. Finish there and you'll come back here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </AlertDialogClose>
            <Button type="button" render={<a href={api.gmailConnectUrl()} />}>
              Continue to Google
              <ExternalLinkIcon />
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={disconnectOpen}
        onOpenChange={(open) => {
          if (!open) setDisconnectOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
            <AlertDialogDescription>
              The assistant stops being able to search your email, and future email questions in
              chat will fail. You can reconnect anytime. This does not delete anything in your
              inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              Keep it connected
            </AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              loading={busy}
              onClick={() => void disconnect()}
            >
              Disconnect
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
