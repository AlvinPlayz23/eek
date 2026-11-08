import { Link2, MessageCircle, Sparkles } from "lucide-react";
import { Container } from "../components/container";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";

const steps = [
  {
    icon: MessageCircle,
    title: "Message the bot",
    copy: "Open Telegram, find @eek_aibot, and say hello. No app to install — the chat is the interface.",
  },
  {
    icon: Link2,
    title: "Link your account",
    copy: "It replies with a sign-in link. Approve the code on your phone and the chat is bound to your account.",
  },
  {
    icon: Sparkles,
    title: "Just chat",
    copy: "Ask for a reminder, an email, a price check, or a command on its Linux computer. Plain language works.",
  },
];

export function HowItWorks() {
  return (
    <Section aria-label="How it works">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            line1="From hello to handled"
            line2="in about a minute."
          >
            No onboarding wizard, no new app. The assistant meets you where you already are.
          </SectionHeader>
        </Reveal>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 70} className="h-full">
              <div className="flex h-full flex-col rounded-lg border border-fog/10 bg-surface-one p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md border border-fog/10 bg-surface-two">
                    <step.icon className="h-4 w-4 text-paper-white" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-fog/15 px-2.5 py-1 text-caption font-medium text-steel">
                    Step 0{index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-heading-sm text-paper-white">{step.title}</h3>
                <p className="mt-2 text-body text-mid-gray">{step.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
