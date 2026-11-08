import { Link2, MessageCircle, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "../components/container";
import { Reveal } from "../components/reveal";

function Me({ children }: { children: ReactNode }) {
  return (
    <span className="self-end rounded-2xl rounded-br-md bg-cobalt px-3 py-1.5 text-[13px] font-medium text-white">
      {children}
    </span>
  );
}

function Bot({ children }: { children: ReactNode }) {
  return (
    <span className="self-start rounded-2xl rounded-bl-md border-2 border-chalk bg-paper px-3 py-1.5 text-[13px] font-medium text-charcoal">
      {children}
    </span>
  );
}

const steps = [
  {
    icon: MessageCircle,
    title: "Message the bot",
    copy: "Open Telegram, find @eek_aibot, and say hello. There's nothing to install.",
    scene: (
      <>
        <Me>hi!</Me>
        <Bot>Hey, I'm ready when you are.</Bot>
      </>
    ),
  },
  {
    icon: Link2,
    title: "Link your account",
    copy: "It replies with a sign-in link. Approve the code on your phone and the chat is linked.",
    scene: (
      <>
        <Bot>Approve this sign-in to link your chat.</Bot>
        <span className="self-start rounded-full border-2 border-cobalt/25 bg-paper px-3 py-1 font-mono text-[13px] font-medium tracking-[0.2em] text-cobalt">
          4 7 1 9
        </span>
      </>
    ),
  },
  {
    icon: Sparkles,
    title: "Just chat",
    copy: "Ask for a reminder, an email, a price check or a command on its computer. Plain language works.",
    scene: (
      <>
        <Me>Remind me to call mum at 6</Me>
        <Bot>Done. Set for 6:00 PM.</Bot>
      </>
    ),
  },
];

// The page's one light band. Everything here is flat and chunky: chalk borders with a thick
// bottom lip, a wash-blue stage per step, and cobalt as the only colour
export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="py-12 md:py-16">
      <div className="mx-3 rounded-4xl bg-paper px-4 py-16 md:mx-6 md:px-6 md:py-24">
        <Container className="px-0 lg:px-0">
          <Reveal>
            <h2 id="how-title" className="headline-section mx-auto max-w-2xl text-center font-semibold">
              <span className="block text-charcoal">From hello to handled</span>
              <span className="block text-cobalt">In about a minute</span>
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3 md:gap-5">
            {steps.map((step, index) => (
              <li key={step.title}>
                <Reveal delay={index * 90} className="h-full">
                  <div className="sticker h-full rounded-2xl bg-paper p-4">
                    <div
                      aria-hidden="true"
                      className="flex h-36 flex-col justify-center gap-2 rounded-xl bg-wash p-4"
                    >
                      {step.scene}
                    </div>
                    <div className="px-2 pb-3 pt-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cobalt font-mono text-sm font-semibold text-white">
                          {index + 1}
                        </span>
                        <h3 className="flex items-center gap-2 text-[17px] font-semibold text-charcoal">
                          {step.title}
                          <step.icon className="h-4 w-4 text-cobalt" aria-hidden="true" />
                        </h3>
                      </div>
                      <p className="mt-3 text-body text-pencil">{step.copy}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </div>
    </section>
  );
}
