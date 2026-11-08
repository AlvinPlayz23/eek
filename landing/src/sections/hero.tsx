import { ArrowRight, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Alpine } from "../components/alpine";
import { Button } from "../components/button";
import { Container } from "../components/container";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";
import { HeroStage } from "./hero-stage";

const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section className="relative pb-6 pt-32 md:pt-40" aria-labelledby="hero-title">
      <Alpine />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#trust"
            className="rise inline-flex items-center gap-2.5 rounded-full border border-fog/10 bg-surface-one/60 py-1 pl-1 pr-3 text-xs text-ash backdrop-blur-sm transition-colors duration-150 ease-out hover:text-ivory motion-reduce:transition-none"
            style={rise(0)}
          >
            <span className="rounded-full bg-surface-three px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-ivory">
              New
            </span>
            Email that waits for your okay
            <ChevronRight className="h-3.5 w-3.5 text-steel" aria-hidden="true" />
          </a>

          <h1 id="hero-title" className="headline-display mt-7">
            <span className="rise block text-ivory" style={rise(60)}>
              A personal assistant
            </span>
            <span className="rise block text-steel" style={rise(150)}>
              that lives in Telegram
            </span>
          </h1>

          <p className="rise mx-auto mt-6 max-w-xl text-body-lg text-ash" style={rise(240)}>
            Set reminders, draft and send email, browse the web, and run commands on its own Linux
            computer, all by sending a message.
          </p>

          <div className="rise mt-9 flex flex-wrap items-center justify-center gap-3" style={rise(310)}>
            <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer">
              Start on Telegram
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button href={DASHBOARD_URL} variant="outline">
              Open dashboard
            </Button>
          </div>

          <p className="rise mt-5 font-mono text-xs text-steel" style={rise(370)}>
            Pro is $15/month, billed through the dashboard.
          </p>
        </div>

        <div className="fade-in mt-14 md:mt-16" style={rise(480)}>
          <HeroStage />
        </div>
      </Container>
    </section>
  );
}
