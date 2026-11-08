import { ArrowRight, ArrowUp, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "../components/button";
import { ChatBubble } from "../components/chat-bubble";
import { Container } from "../components/container";
import { LogoMark } from "../components/logo";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";

const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section className="pb-12 pt-12 md:pb-16 md:pt-20" aria-labelledby="hero-title">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <a
              href="#features"
              className="rise inline-flex items-center gap-2.5 text-xs text-mid-gray transition-colors hover:text-paper-white motion-reduce:transition-none"
              style={rise(0)}
            >
              <span className="rounded-md bg-electric-blue px-2 py-1 text-caption font-medium text-paper-white">
                New
              </span>
              Email that waits for your okay
              <ChevronRight className="h-3.5 w-3.5 text-steel" aria-hidden="true" />
            </a>

            <h1 id="hero-title" className="headline-display rise mt-7" style={rise(60)}>
              <span className="block text-paper-white">Your life, handled</span>
              <span className="block text-mid-gray">one message at a time.</span>
            </h1>

            <p className="rise mt-6 max-w-lg text-body-lg text-mid-gray" style={rise(120)}>
              Personal Assistant lives in Telegram. Set reminders, draft and send email, browse the
              web, and use its own Linux computer — all by chatting.
            </p>

            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={rise(180)}>
              <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                Start on Telegram
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button href={DASHBOARD_URL} variant="secondary">
                Open dashboard
              </Button>
            </div>

            <p className="rise mt-5 text-xs text-steel" style={rise(240)}>
              Pro is $15/month, billed through the dashboard. Message the bot to get started.
            </p>
          </div>

          <div className="rise" style={rise(220)}>
            <div className="rounded-2xl border border-fog/10 bg-surface-one p-3">
              <div className="flex items-center justify-between gap-3 px-1.5 pb-3">
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
                <span className="shrink-0 rounded-full border border-fog/15 px-2.5 py-1 text-caption text-steel">
                  Today
                </span>
              </div>

              <div className="space-y-2">
                <ChatBubble from="user" time="09:12">
                  Remind me to call the dentist tomorrow at 9.
                </ChatBubble>
                <ChatBubble from="assistant" time="09:12">
                  Done — tomorrow at 9:00. I&rsquo;ll message you here.
                </ChatBubble>
                <ChatBubble from="user" time="09:13">
                  Draft a note to Sam about the invoice.
                </ChatBubble>
                <ChatBubble from="assistant" time="09:13">
                  Drafted <span className="text-paper-white">«Invoice follow-up»</span> to sam@…. Say
                  &ldquo;send it&rdquo; when you&rsquo;re ready — nothing sends before you confirm.
                </ChatBubble>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-md border border-fog/10 bg-surface-two px-3 py-2">
                <span className="flex-1 truncate text-xs text-steel">Message Personal Assistant…</span>
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-electric-blue"
                  aria-hidden="true"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-paper-white" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
