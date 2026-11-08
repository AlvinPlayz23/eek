import { ArrowUp } from "lucide-react";
import { ChatBubble } from "../components/chat-bubble";
import { Container } from "../components/container";
import { LogoMark } from "../components/logo";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";

export function ChatPreview() {
  return (
    <Section aria-label="Conversation preview">
      <Container>
        <Reveal>
          <SectionHeader eyebrow="In practice" line1="One chat," line2="the whole day.">
            A sample conversation, shortened. The same assistant answers on Telegram.
          </SectionHeader>
        </Reveal>

        <Reveal delay={80} className="mt-12">
          <div className="mx-auto max-w-4xl rounded-2xl border border-fog/10 bg-surface-one p-3 md:p-4">
            <div className="flex items-center justify-between gap-3 border-b border-fog/10 px-1.5 pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <LogoMark />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-paper-white">Personal Assistant</p>
                  <p className="flex items-center gap-1.5 text-caption text-steel">
                    <span className="h-1.5 w-1.5 rounded-full bg-fog/60" aria-hidden="true" />
                    online on Telegram
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-caption text-steel">Today · 08:12</span>
            </div>

            <div className="space-y-2 px-1 py-4">
              <ChatBubble from="assistant" time="08:12">
                Morning. Two reminders today: call the dentist at 9:00, and send the invoice before
                17:00. You also have an unsent draft to priya@example.com.
              </ChatBubble>
              <ChatBubble from="user" time="08:14">
                Change the cap in the draft to 12k and send it.
              </ChatBubble>
              <ChatBubble from="assistant" time="08:14">
                Updated — the draft now reads:{" "}
                <span className="text-paper-white">
                  «Thanks, we&rsquo;re aligned on the $12k cap. I&rsquo;ll send the revised numbers
                  Monday.»
                </span>{" "}
                Nothing has been sent yet. Say &ldquo;send it&rdquo; to send this version.
              </ChatBubble>
              <ChatBubble from="user" time="08:15">
                send it
              </ChatBubble>
              <ChatBubble from="assistant" time="08:15">
                Sent to priya@example.com. ✓
              </ChatBubble>
              <ChatBubble from="user" time="08:16">
                Nice. Does the venue take bookings for Friday?
              </ChatBubble>
              <ChatBubble from="assistant" time="08:16">
                Their site says bookings open 30 days ahead, and Friday still has 18:30 and 20:00
                tables. Want a reminder to book?
              </ChatBubble>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-fog/10 bg-surface-two px-3 py-2.5">
              <span className="flex-1 truncate text-xs text-steel">Message Personal Assistant…</span>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-electric-blue"
                aria-hidden="true"
              >
                <ArrowUp className="h-3.5 w-3.5 text-paper-white" />
              </span>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
