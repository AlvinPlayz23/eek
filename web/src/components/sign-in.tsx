import { useEffect, useState } from "react";
import { BellIcon, ClockIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InlineError } from "@/components/ui-kit";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage, type DeviceStart } from "@/lib/api";

type Phase = "idle" | "waiting" | "denied" | "expired" | "failed";

const FEATURES = [
  {
    icon: BellIcon,
    title: "Reminders that stay put",
    body: "Pause, resume or reschedule a series without re-explaining it.",
  },
  {
    icon: ClockIcon,
    title: "Your timezone, not ours",
    body: "Every occurrence is shown in the zone it was created in.",
  },
  {
    icon: ShieldCheckIcon,
    title: "The same account as chat",
    body: "Sign-in goes through Clerk; this browser only gets a signed cookie.",
  },
];

export function SignIn({ onSignedIn }: { onSignedIn: (email: string | null) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const started = await api.startSignIn();
      setDevice(started);
      setPhase("waiting");
      setCopied(false);
    } catch (reason) {
      setError(errorMessage(reason));
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  };

  // The device flow is polled server-side: the browser never holds a Clerk token, only the
  // device code cookie that this app set
  useEffect(() => {
    if (phase !== "waiting" || !device) return;

    let cancelled = false;
    let timer = 0;
    let delay = Math.max(device.interval, 5) * 1000;

    const tick = async () => {
      try {
        const result = await api.pollSignIn();
        if (cancelled) return;
        if (result.status === "linked") {
          onSignedIn(result.email);
          return;
        }
        if (result.status === "denied") {
          setPhase("denied");
          return;
        }
        if (result.status === "expired") {
          setPhase("expired");
          return;
        }
        if (result.status === "slow_down") delay += 5000;
      } catch (reason) {
        if (cancelled) return;
        if (reason instanceof Error && "status" in reason && reason.status === 401) {
          setPhase("expired");
          return;
        }
        setError(errorMessage(reason));
      }
      timer = window.setTimeout(tick, delay);
    };

    timer = window.setTimeout(tick, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [device, onSignedIn, phase]);

  const copy = async () => {
    if (!device) return;
    try {
      await navigator.clipboard.writeText(device.userCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the code is on screen to type by hand
    }
  };

  const reset = () => {
    setDevice(null);
    setError(null);
    setPhase("idle");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-fog text-ink">
      <div
        aria-hidden="true"
        className="halo pointer-events-none absolute inset-x-0 top-0 h-[620px]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-5 py-6 sm:px-8 md:px-10">
        <header className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-[26px] place-items-center rounded-[8px] bg-brand text-white">
              <SparklesIcon className="size-3.5" />
            </span>
            <span className="text-[14px] font-medium tracking-[-0.01em]">Assistant</span>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:py-16">
          <div className="reveal max-w-[460px]">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-ash">
              Personal assistant · Dashboard
            </p>
            <h1 className="mt-4 text-[38px] font-semibold leading-[1.03] tracking-[-0.035em] text-ink sm:text-[50px] md:text-[56px]">
              Your assistant,
              <br />
              on the web.
            </h1>
            <p className="mt-5 max-w-[42ch] text-[15px] leading-[1.6] text-graphite">
              Reminders, plan and linked channels in one place. Sign in with the same account
              your chat is already connected to.
            </p>

            <ul className="mt-9 flex flex-col gap-4">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3">
                  <span className="raised mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] text-graphite">
                    <feature.icon className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{feature.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-[1.5] text-graphite">
                      {feature.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal w-full max-w-[400px] md:justify-self-end">
            <div className="panel p-6">
              {phase === "idle" || phase === "failed" ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
                      Sign in
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-graphite">
                      Approve this browser with a short code. You'll finish on Clerk's page.
                    </p>
                  </div>
                  <Button className="w-full" size="lg" loading={busy} onClick={() => void start()}>
                    Continue with Clerk
                  </Button>
                  <InlineError message={error} />
                </div>
              ) : null}

              {phase === "waiting" && device ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
                      Approve the sign-in
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-graphite">
                      Open the sign-in page, confirm the code, then come back to this tab.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-[12px] bg-fog px-4 py-3 ring-1 ring-hairline">
                    <span className="text-[19px] tracking-[0.06em] text-ink">
                      {device.userCode}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => void copy()}>
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    render={
                      <a
                        href={device.verificationUriComplete}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    Open sign-in page
                  </Button>

                  <div className="flex items-center gap-2 text-[12px] text-graphite">
                    <Spinner className="size-3.5 text-brand" />
                    Waiting for approval…
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    className="self-start rounded-[6px] text-[12px] text-ash underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Use a different account
                  </button>

                  <InlineError message={error} />
                </div>
              ) : null}

              {phase === "denied" || phase === "expired" ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
                      {phase === "denied" ? "Sign-in cancelled" : "That code expired"}
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-graphite">
                      {phase === "denied"
                        ? "Nothing changed. Start again whenever you're ready."
                        : "Codes are short-lived. Get a fresh one to continue."}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    loading={busy}
                    onClick={() => void start()}
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
            </div>

            <p className="mt-4 text-center text-[11px] leading-[1.5] text-ash">
              Signed in with Clerk. This browser gets its own session cookie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
