import { Check, Mail, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "../components/container";
import { Surface } from "../components/glass";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";

function Stepper() {
  const steps = [
    { label: "Draft written", detail: "Shown to you first", state: "done" },
    { label: "Waiting for your okay", detail: "Reply “send it” in a new message", state: "active" },
    { label: "Sent", detail: "Only after you confirm", state: "pending" },
  ] as const;

  return (
    <ol className="flex h-full flex-col justify-center px-6">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="absolute left-[9px] top-5 h-[calc(100%-12px)] w-px bg-fog/15" />
          ) : null}
          <span
            aria-hidden="true"
            className={`relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
              step.state === "done"
                ? "bg-ivory"
                : step.state === "active"
                  ? "border-2 border-ivory bg-onyx"
                  : "border border-fog/20 bg-onyx"
            }`}
          >
            {step.state === "done" ? <Check className="h-3 w-3 text-onyx" /> : null}
            {step.state === "active" ? <span className="h-1.5 w-1.5 rounded-full bg-ivory" /> : null}
          </span>
          <span className="leading-tight">
            <span
              className={`block text-[13px] font-medium ${step.state === "pending" ? "text-steel" : "text-ivory"}`}
            >
              {step.label}
            </span>
            <span className="mt-0.5 block text-[11px] text-steel">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Connections() {
  return (
    <ul className="flex h-full flex-col justify-center gap-2 px-5">
      <li className="flex items-center gap-3 rounded-lg bg-surface-one px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-three">
          <Send className="h-4 w-4 text-ivory" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[13px] font-medium text-ivory">Telegram</span>
          <span className="block text-[11px] text-steel">Linked to your account</span>
        </span>
      </li>
      <li className="flex items-center gap-3 rounded-lg bg-surface-one px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-three">
          <Mail className="h-4 w-4 text-ivory" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[13px] font-medium text-ivory">Gmail</span>
          <span className="block text-[11px] text-steel">Connected through Google</span>
        </span>
        <span className="shrink-0 rounded-md border border-fog/15 px-2 py-1 text-[11px] font-medium text-ash">
          Disconnect
        </span>
      </li>
    </ul>
  );
}

function Shell() {
  return (
    <div className="flex h-full flex-col justify-center px-6 font-mono text-xs leading-6">
      <p className="text-ivory">
        <span className="text-graphite">$ </span>python report.py
      </p>
      <p className="text-steel">reading 12,480 rows</p>
      <p className="flex items-center gap-1.5 text-ash">
        <Check className="h-3 w-3" aria-hidden="true" />
        report.csv written
      </p>
      <p className="text-ivory">
        <span className="text-graphite">$ </span>
        <span className="inline-block h-3 w-1.5 translate-y-0.5 bg-ash" aria-hidden="true" />
      </p>
    </div>
  );
}

const cards: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: "Confirm before send",
    body: "Drafts are shown to you first. A send only happens after you confirm in a later message, and unsent drafts expire after 15 minutes.",
    visual: <Stepper />,
  },
  {
    title: "You own the connection",
    body: "Gmail connects through a Google connection you control. Disconnect it from the dashboard and the assistant loses access.",
    visual: <Connections />,
  },
  {
    title: "Its own computer",
    body: "Commands run in a sandboxed Linux machine, not on your devices. Long jobs keep going and report back in the chat.",
    visual: <Shell />,
  },
];

export function Trust() {
  return (
    <Section id="trust" aria-labelledby="trust-title">
      <Container>
        <SectionHeader id="trust-title" line1="Built to be trusted" line2="With your inbox and your time" />

        <div className="mt-14 grid gap-2 md:grid-cols-3">
          {cards.map((card, index) => (
            <Reveal key={card.title} delay={index * 70} className="h-full">
              <Surface className="flex h-full flex-col rounded-2xl p-3">
                <div className="h-[208px] overflow-hidden rounded-lg border border-fog/10 bg-onyx">
                  {card.visual}
                </div>
                <div className="px-2 pb-2 pt-5">
                  <h3 className="text-body font-semibold text-ivory">{card.title}</h3>
                  <p className="mt-1.5 text-body text-ash">{card.body}</p>
                </div>
              </Surface>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
