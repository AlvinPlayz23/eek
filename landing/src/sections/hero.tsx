import { ArrowRight, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Button } from "../components/button";
import { Container } from "../components/container";
import { LogoMark } from "../components/logo";
import { Marquee } from "../components/marquee";
import {
  DraftVisual,
  FileVisual,
  HoursVisual,
  InboxVisual,
  ProgressVisual,
  RepeatVisual,
  ReminderVisual,
  SearchVisual,
  SentVisual,
  TerminalVisual,
  Tile,
} from "../components/moments";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";
import { usePrefersReducedMotion } from "../lib/hooks";

const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

const prompts = [
  "Remind me to call the dentist tomorrow at 9.",
  "Did Priya reply about the invoice?",
  "Turn talk.mp4 into an mp3 and send it back.",
  "Cheapest direct flight to Lisbon in March?",
  "Every weekday at 8, tell me what's on my list.",
];

function PromptTicker() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % prompts.length), 3600);
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <p className="flex min-w-0 items-center gap-3 text-xs text-mid-gray">
      <LogoMark className="h-5 w-5 shrink-0" />
      <span className="shrink-0">Try asking</span>
      <span className="relative block h-5 min-w-0 flex-1 overflow-hidden">
        <span key={index} className="swap-in block truncate text-paper-white/70">
          &ldquo;{prompts[index]}&rdquo;
        </span>
      </span>
    </p>
  );
}

const rowOne = [
  <Tile key="a1" width={229}>
    <ReminderVisual title="Call the dentist" time="9:00" when="Tomorrow" />
  </Tile>,
  <Tile key="a2" width={160} tone="light">
    <RepeatVisual label="Every weekday" active={[0, 1, 2, 3, 4]} tone="light" />
  </Tile>,
  <Tile key="a3" width={245}>
    <SearchVisual
      query="flights to Lisbon in March"
      rows={[
        { site: "skyfares.example", value: "€94" },
        { site: "flightdeals.example", value: "€108" },
        { site: "airlines.example", value: "€121" },
      ]}
    />
  </Tile>,
  <Tile key="a4" width={140}>
    <SentVisual to="priya@example.com" />
  </Tile>,
  <Tile key="a5" width={229}>
    <DraftVisual to="sam@example.com" subject="Invoice follow-up" status="Waiting for “send it”" />
  </Tile>,
  <Tile key="a6" width={170}>
    <FileVisual name="talk.mp3" size="4.2 MB" />
  </Tile>,
  <Tile key="a7" width={245}>
    <InboxVisual
      rows={[
        { from: "Priya", subject: "Re: Invoice numbers", time: "16:40" },
        { from: "Jonas", subject: "Friday dinner?", time: "11:02" },
        { from: "Maya", subject: "Photos from the trip", time: "Mon" },
      ]}
    />
  </Tile>,
];

const rowTwo = [
  <Tile key="b1" width={245}>
    <TerminalVisual
      lines={[
        { text: "ffmpeg -i talk.mp4 talk.mp3", tone: "cmd" },
        { text: "size=4210kB time=00:04:12", tone: "out" },
        { text: "done · talk.mp3 written", tone: "done" },
      ]}
    />
  </Tile>,
  <Tile key="b2" width={160}>
    <ReminderVisual title="Pay rent" time="1st" when="Every month" />
  </Tile>,
  <Tile key="b3" width={229}>
    <HoursVisual
      highlight="Sun"
      rows={[
        { day: "Fri", hours: "12:00–23:00" },
        { day: "Sat", hours: "12:00–23:00" },
        { day: "Sun", hours: "17:00–23:00" },
      ]}
    />
  </Tile>,
  <Tile key="b4" width={150} tone="light">
    <SentVisual to="sam@example.com" tone="light" />
  </Tile>,
  <Tile key="b5" width={200}>
    <ProgressVisual label="Downloading dataset" percent={68} note="I'll message you when it's done" />
  </Tile>,
  <Tile key="b6" width={229}>
    <DraftVisual to="landlord@example.com" subject="Re: Repair visit" status="Waiting for “send it”" />
  </Tile>,
  <Tile key="b7" width={150}>
    <RepeatVisual label="Gym" active={[1, 3, 5]} />
  </Tile>,
];

export function Hero() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="pb-6 pt-12 md:pt-20" aria-labelledby="hero-title">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <a
              href="#trust"
              className="rise inline-flex items-center gap-2.5 text-xs text-mid-gray transition-colors duration-150 ease-out hover:text-paper-white motion-reduce:transition-none"
              style={rise(0)}
            >
              <span className="rounded-md bg-electric-blue px-2 py-1 text-caption font-medium text-paper-white">
                New
              </span>
              Email that waits for your okay
              <ChevronRight className="h-3.5 w-3.5 text-steel" aria-hidden="true" />
            </a>

            <h1 id="hero-title" className="headline-display mt-6">
              <span className="rise block text-paper-white" style={rise(60)}>
                A personal assistant
              </span>
              <span className="rise block text-mid-gray" style={rise(150)}>
                that lives in Telegram
              </span>
            </h1>
          </div>

          <div>
            <p className="rise max-w-md text-body-lg text-mid-gray" style={rise(240)}>
              Set reminders, draft and send email, browse the web, and run commands on its own Linux
              computer — all by sending a message.
            </p>
            <div className="rise mt-6 flex flex-wrap items-center gap-2" style={rise(310)}>
              <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                Start on Telegram
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button href={DASHBOARD_URL} variant="secondary">
                Open dashboard
              </Button>
            </div>
            <p className="rise mt-4 text-xs text-steel" style={rise(370)}>
              Pro is $15/month, billed through the dashboard.
            </p>
          </div>
        </div>

        <div className="fade-in mt-14 flex items-center justify-between gap-4 md:mt-16" style={rise(440)}>
          <p className="flex items-center gap-2.5 text-sm">
            <LogoMark className="h-5 w-5" />
            <span className="font-medium text-paper-white">Done in one message</span>
            <a
              href="#chat"
              className="text-mid-gray transition-colors duration-150 ease-out hover:text-paper-white motion-reduce:transition-none"
            >
              See more
            </a>
          </p>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            aria-label={paused ? "Play the example wall" : "Pause the example wall"}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-one text-paper-white transition-[background-color,transform] duration-150 ease-out hover:bg-surface-two active:scale-95 motion-reduce:hidden"
          >
            {paused ? (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      <div
        className="fade-in mt-4 space-y-2 [--tile-h:124px] [mask-image:linear-gradient(to_bottom,#000_58%,transparent)] sm:[--tile-h:140px]"
        style={rise(520)}
        role="group"
        aria-label="Examples of requests the assistant handles"
      >
        <Marquee paused={paused} duration={90}>
          {rowOne}
        </Marquee>
        <Marquee reverse paused={paused} duration={110}>
          {rowTwo}
        </Marquee>
      </div>

      <Container>
        <div className="fade-in mt-5" style={rise(640)}>
          <PromptTicker />
        </div>
      </Container>
    </section>
  );
}
