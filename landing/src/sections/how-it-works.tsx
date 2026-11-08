import { Link2, MessageCircle, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { Container } from "../components/container";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";
import { useInView } from "../lib/hooks";

const steps = [
  {
    icon: MessageCircle,
    title: "Message the bot",
    copy: "Open Telegram, find @eek_aibot, and say hello. There's nothing to install.",
  },
  {
    icon: Link2,
    title: "Link your account",
    copy: "It replies with a sign-in link. Approve the code on your phone and the chat is linked.",
  },
  {
    icon: Sparkles,
    title: "Just chat",
    copy: "Ask for a reminder, an email, a price check or a command on its computer. Plain language works.",
  },
];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLOListElement>({ threshold: 0.35, once: true });

  return (
    <Section aria-labelledby="how-title">
      <Container>
        <SectionHeader id="how-title" line1="From hello to handled" line2="In about a minute" />

        <ol
          ref={ref}
          data-visible={inView ? "true" : "false"}
          className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8"
        >
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="relative h-px bg-fog/10">
                <span
                  className="rail-fill absolute inset-0 bg-paper-white/70"
                  style={{ "--rail-delay": `${index * 500}ms` } as CSSProperties}
                />
              </div>
              <div className="mt-5 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-surface-one">
                  <step.icon className="h-4 w-4 text-paper-white" aria-hidden="true" />
                </span>
                <h3 className="text-body font-semibold text-paper-white">
                  <span className="mr-2 text-steel">{index + 1}</span>
                  {step.title}
                </h3>
              </div>
              <p className="mt-3 max-w-sm text-body text-mid-gray">{step.copy}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
