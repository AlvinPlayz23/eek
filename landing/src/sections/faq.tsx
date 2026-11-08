import { Plus } from "lucide-react";
import { Container } from "../components/container";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";

const faqs = [
  {
    question: "What exactly is Personal Assistant?",
    answer:
      "A chat assistant that runs on Telegram. You link your account once, then talk to it like a person: reminders, email, the web, and its own Linux computer.",
  },
  {
    question: "How do I get started?",
    answer:
      "Message @eek_aibot on Telegram. It replies with a sign-in link, you approve the code on your phone, and the chat is linked. The whole thing takes about a minute.",
  },
  {
    question: "What can it do with my email?",
    answer:
      "It connects to Gmail, so it can search and read mail and write drafts. It never sends on its own: the draft is shown to you, and a send only happens after you confirm in a later message. Drafts expire after 15 minutes, and you can disconnect Gmail from the dashboard at any time.",
  },
  {
    question: "What does Pro include?",
    answer:
      "Everything: chat on Telegram, reminders, Gmail drafts, web browsing, and the Linux computer. It is $15 per month, billed through Clerk, and you can manage or cancel it from the dashboard billing page.",
  },
  {
    question: "Where does the Linux computer live?",
    answer:
      "Each conversation gets a sandboxed Linux machine it can run commands on. Long jobs keep running in the background, and the assistant checks on them and reports back in chat.",
  },
  {
    question: "How is my data handled?",
    answer:
      "Your chat, reminders and connected Gmail account are stored in the app's Postgres database. Email access goes through a Google connection you control and can revoke from the dashboard Connections page.",
  },
];

export function Faq() {
  return (
    <Section id="faq">
      <Container>
        <Reveal>
          <SectionHeader eyebrow="FAQ" line1="Questions," line2="answered.">
            The short version of how the assistant works, what Pro covers, and what happens to your
            data.
          </SectionHeader>
        </Reveal>

        <Reveal delay={80} className="mt-12">
          <div className="divide-y divide-fog/10 border-y border-fog/10">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="group py-5" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium text-paper-white">
                  {faq.question}
                  <Plus
                    className="h-4 w-4 shrink-0 text-steel transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 max-w-2xl pr-8 text-body text-mid-gray">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
