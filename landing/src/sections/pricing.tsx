import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "../components/button";
import { Container } from "../components/container";
import { Surface } from "../components/glass";
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
    <Section id="pricing" aria-labelledby="pricing-title">
      <Container>
        <SectionHeader id="pricing-title" line1="One plan" line2="Everything unlocked">
          No tiers to compare. Pro is the whole assistant, billed monthly through the dashboard.
        </SectionHeader>

        <Reveal className="mt-14">
          <Surface className="mx-auto max-w-4xl rounded-2xl p-3">
            <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col rounded-lg border border-fog/10 bg-pure-black p-6 md:p-8">
                <span className="inline-flex w-fit rounded-full border border-fog/15 px-3 py-1 text-xs font-medium text-paper-white">
                  Pro
                </span>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-display text-paper-white">$15</span>
                  <span className="pb-2 text-body text-mid-gray">per month</span>
                </div>

                <p className="mt-2 max-w-sm text-body text-mid-gray">
                  Billed monthly through Clerk. Cancel from the dashboard at any time.
                </p>

                <div className="mt-auto pt-8">
                  <Button href={BILLING_URL}>
                    Get Pro in the dashboard
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <p className="mt-3 text-xs text-steel">
                    Pro is required to chat with the assistant. Already subscribed? Manage it on the
                    same page.
                  </p>
                </div>
              </div>

              <div className="p-3 md:p-8">
                <p className="text-sm font-medium text-paper-white">Everything included</p>
                <ul className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-1">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-body text-mid-gray">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-surface-two">
                        <Check className="h-2.5 w-2.5 text-paper-white" aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Surface>
        </Reveal>
      </Container>
    </Section>
  );
}
