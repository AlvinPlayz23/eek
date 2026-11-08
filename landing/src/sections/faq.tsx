import { Container } from "../components/container";
import { Disclosure } from "../components/disclosure";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";

const faqs = [
  {
    question: "What exactly is Personal assistant?",
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
    <Section id="faq" aria-labelledby="faq-title">
      <Container>
        <SectionHeader id="faq-title" line1="Questions" line2="Answered">
          How the assistant works, what Pro covers, and what happens to your data.
        </SectionHeader>

        <Reveal className="mt-14">
          <div className="mx-auto max-w-3xl">
            {faqs.map((faq, index) => (
              <Disclosure key={faq.question} question={faq.question} defaultOpen={index === 0}>
                {faq.answer}
              </Disclosure>
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
