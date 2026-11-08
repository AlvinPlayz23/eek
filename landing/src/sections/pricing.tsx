import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "../components/button";
import { Container } from "../components/container";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";
import { BILLING_URL } from "../lib/links";

const included = [
  "Chat on Telegram",
  "Reminders with repeats and pause",
  "Gmail search, reading and drafts",
  "Confirm-before-send email",
  "Web browsing and page reading",
  "A sandboxed Linux computer",
];

export function Pricing() {
  return (
    <Section id="pricing">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="Pricing"
            line1="One plan."
            line2="Everything, unlocked."
          >
            No tiers to compare. Pro is the whole assistant — billed monthly through the dashboard.
          </SectionHeader>
        </Reveal>

        <Reveal delay={80} className="mt-12">
          <div className="rounded-2xl border border-fog/10 bg-surface-one p-6 md:p-10">
            <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
              <div>
                <span className="inline-flex rounded-full border border-fog/15 px-3 py-1 text-xs font-medium text-mid-gray">
                  Pro
                </span>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-display text-paper-white">$15</span>
                  <span className="pb-2 text-body text-mid-gray">/ month</span>
                </div>

                <p className="mt-2 max-w-sm text-body text-steel">
                  Billed monthly through Clerk. Cancel from the dashboard at any time.
                </p>

                <Button href={BILLING_URL} className="mt-8">
                  Get Pro in the dashboard
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Button>

                <p className="mt-3 text-xs text-steel">
                  Pro is required to chat with the assistant. Subscribed already? Manage it from the
                  same page.
                </p>
              </div>

              <div className="md:border-l md:border-fog/10 md:pl-12">
                <p className="text-sm font-medium text-paper-white">Everything included</p>
                <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-body text-mist">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-steel" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
