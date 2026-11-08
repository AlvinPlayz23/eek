import { ArrowRight, BellRing, Globe2, Mail, SquareTerminal } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "../components/container";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex h-full flex-col rounded-lg border border-fog/10 bg-surface-one p-6 ${className}`}>
      {children}
    </div>
  );
}

function IconChip({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-md border border-fog/10 bg-surface-two">
      {children}
    </span>
  );
}

function GateStep({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-md border border-fog/10 bg-surface-two px-3 py-2.5">
      <p className="text-xs font-medium text-paper-white">{label}</p>
      <p className="mt-0.5 text-caption text-steel">{detail}</p>
    </div>
  );
}

export function Features() {
  return (
    <Section id="features">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="Capabilities"
            line1="It handles the things"
            line2="you keep meaning to do."
          >
            Four abilities, one chat. No dashboards to learn — the assistant is the interface.
          </SectionHeader>
        </Reveal>

        <div className="mt-12 grid gap-3 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <Card>
              <IconChip>
                <BellRing className="h-4 w-4 text-paper-white" aria-hidden="true" />
              </IconChip>
              <h3 className="mt-6 text-heading-sm text-paper-white">Reminders that stick</h3>
              <p className="mt-2 text-body text-mid-gray">
                Natural language, real repeats. &ldquo;Every second Tuesday at 7&rdquo;, &ldquo;in 40
                minutes&rdquo;, &ldquo;weekdays at 8&rdquo;. Pause, resume, or rerun without a settings
                page.
              </p>
              <div className="mt-auto pt-6">
                <div className="flex items-center justify-between gap-3 rounded-md border border-fog/10 bg-surface-two px-3 py-2.5 text-xs">
                  <span className="flex items-center gap-2 text-mist">
                    <BellRing className="h-3.5 w-3.5 text-steel" aria-hidden="true" />
                    Call the dentist
                  </span>
                  <span className="shrink-0 text-graphite">Tomorrow · 09:00</span>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={60} className="lg:col-span-7">
            <Card>
              <IconChip>
                <Mail className="h-4 w-4 text-paper-white" aria-hidden="true" />
              </IconChip>
              <h3 className="mt-6 text-heading-sm text-paper-white">
                Email, sent only when you say so
              </h3>
              <p className="mt-2 max-w-xl text-body text-mid-gray">
                Search and read your Gmail, then ask for a draft. It writes one, shows it, and
                waits. Nothing leaves the outbox until you confirm in a new message — so a clever
                sentence in an email can never talk it into sending.
              </p>
              <div className="mt-auto pt-6">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                  <GateStep label="Draft" detail="draftEmail" />
                  <ArrowRight className="hidden h-3.5 w-3.5 text-charcoal sm:block" aria-hidden="true" />
                  <GateStep label="You confirm" detail="a later message" />
                  <ArrowRight className="hidden h-3.5 w-3.5 text-charcoal sm:block" aria-hidden="true" />
                  <GateStep label="Sent" detail="sendDraft" />
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal className="lg:col-span-7">
            <Card>
              <IconChip>
                <Globe2 className="h-4 w-4 text-paper-white" aria-hidden="true" />
              </IconChip>
              <h3 className="mt-6 text-heading-sm text-paper-white">Reads the web for you</h3>
              <p className="mt-2 max-w-xl text-body text-mid-gray">
                Flight prices, opening hours, a page that won&rsquo;t load — ask, and it searches,
                reads the relevant pages, and answers with what it found.
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {["Search", "Compare", "Summarise"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-fog/15 px-3 py-1 text-xs font-medium text-mid-gray"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={60} className="lg:col-span-5">
            <Card>
              <IconChip>
                <SquareTerminal className="h-4 w-4 text-paper-white" aria-hidden="true" />
              </IconChip>
              <h3 className="mt-6 text-heading-sm text-paper-white">Its own Linux computer</h3>
              <p className="mt-2 text-body text-mid-gray">
                A sandbox with a shell. It runs commands, keeps files between tasks, and checks on
                long jobs in the background while you get on with your day.
              </p>
              <div className="mt-auto pt-6">
                <div className="rounded-md border border-fog/10 bg-surface-two px-3 py-2.5 text-xs">
                  <p className="truncate text-mist">
                    <span className="text-graphite">$</span> ffmpeg -i talk.mp4 talk.mp3
                  </p>
                  <p className="mt-1 text-caption text-steel">done · talk.mp3 written</p>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
