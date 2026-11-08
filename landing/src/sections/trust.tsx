import { ArrowRight, Pause, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Collapse } from "../components/disclosure";
import { Container } from "../components/container";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";
import { TerminalVisual } from "../components/moments";

function Gate() {
  const steps = [
    { label: "Draft", on: false },
    { label: "You confirm", on: true },
    { label: "Sent", on: false },
  ];
  return (
    <div className="flex h-full items-center justify-center gap-1.5 p-3">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-1.5">
          <span
            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
              step.on
                ? "border-paper-white/60 bg-surface-two text-paper-white"
                : "border-fog/10 bg-surface-one text-steel"
            }`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 ? (
            <ArrowRight className="h-3 w-3 text-charcoal" aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Connection() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4">
      <div className="flex items-center justify-between rounded-md bg-surface-one px-3 py-2.5">
        <span className="text-xs font-medium text-paper-white">Gmail</span>
        <span className="flex items-center gap-2 text-caption text-mid-gray">
          Connected
          <span className="flex h-4 w-7 items-center justify-end rounded-full bg-paper-white px-0.5">
            <span className="h-3 w-3 rounded-full bg-pure-black" />
          </span>
        </span>
      </div>
      <p className="px-1 text-caption text-steel">Disconnect from the dashboard at any time.</p>
    </div>
  );
}

function RemindersList() {
  const rows = [
    { title: "Check my list", when: "Weekdays · 08:00", paused: false },
    { title: "Pay rent", when: "1st of the month", paused: true },
    { title: "Call the dentist", when: "Tomorrow · 09:00", paused: false },
  ];
  return (
    <ul className="flex h-full flex-col justify-center gap-1.5 p-3">
      {rows.map((row) => (
        <li
          key={row.title}
          className="flex items-center justify-between gap-2 rounded-md bg-surface-one px-2.5 py-2 text-[11px]"
        >
          <span className={row.paused ? "text-steel" : "text-paper-white"}>{row.title}</span>
          <span className="flex items-center gap-1.5 text-caption text-steel">
            {row.paused ? <Pause className="h-3 w-3" aria-hidden="true" /> : null}
            {row.paused ? "Paused" : row.when}
          </span>
        </li>
      ))}
    </ul>
  );
}

const cards: { title: string; summary: string; detail: string; visual: ReactNode }[] = [
  {
    title: "Confirm before send.",
    summary: "Drafts are shown to you first. A send only happens after you confirm.",
    detail:
      "Confirmation has to come from you, in a later message, so a clever sentence inside an email can never talk the assistant into sending. Unsent drafts expire after 15 minutes.",
    visual: <Gate />,
  },
  {
    title: "You own the connection.",
    summary: "Gmail is linked through a Google connection you control.",
    detail:
      "Search and read access exists only while the connection does. Disconnect it from the Connections page in the dashboard and the assistant loses access.",
    visual: <Connection />,
  },
  {
    title: "Its own computer.",
    summary: "Commands run in a sandboxed Linux machine, not on your devices.",
    detail:
      "Each conversation gets its own sandbox. Long jobs keep running in the background while the assistant checks on them and reports back in chat.",
    visual: (
      <TerminalVisual
        lines={[
          { text: "pip install pandas", tone: "cmd" },
          { text: "Successfully installed pandas", tone: "out" },
          { text: "python report.py", tone: "cmd" },
          { text: "done · report.csv written", tone: "done" },
        ]}
      />
    ),
  },
  {
    title: "Control by asking.",
    summary: "Pause, edit or cancel a reminder in plain language.",
    detail:
      "Ask it to list what's coming, pause a repeating reminder while you're away, or resume it later. If a paused reminder's time has passed, it's rescheduled to the next occurrence.",
    visual: <RemindersList />,
  },
];

function TrustCard({ card }: { card: (typeof cards)[number] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="flex flex-col rounded-2xl border border-fog/10 bg-surface-one p-3">
      <div className="h-[168px] overflow-hidden rounded-lg border border-fog/10 bg-pure-black">
        {card.visual}
      </div>
      <div className="px-2 pb-1 pt-4">
        <p className="text-body text-mid-gray lg:min-h-[63px]">
          <span className="font-semibold text-paper-white">{card.title}</span> {card.summary}
        </p>
        <Collapse open={open} id={panelId}>
          <p className="pt-3 text-body text-mid-gray">{card.detail}</p>
        </Collapse>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? "Hide" : "Show"} details: ${card.title}`}
            onClick={() => setOpen((value) => !value)}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-two text-paper-white transition-[background-color,transform] duration-150 ease-out hover:bg-surface-three active:scale-95 motion-reduce:transition-none"
          >
            <Plus
              className={`h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                open ? "rotate-45" : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Trust() {
  return (
    <Section id="trust" aria-labelledby="trust-title">
      <Container>
        <SectionHeader id="trust-title" line1="Built to be trusted" line2="With your inbox and your time" />
        <Reveal className="mt-12">
          <div className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <TrustCard key={card.title} card={card} />
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
