import { ArrowRight, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "../components/button";
import { Container } from "../components/container";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";
import { HeroStage } from "./hero-stage";

const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section className="pb-6 pt-12 md:pt-16" aria-labelledby="hero-title">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#trust"
            className="rise inline-flex items-center gap-2.5 text-xs text-ash transition-colors duration-150 ease-out hover:text-ivory motion-reduce:transition-none"
            style={rise(0)}
          >
            <span className="rounded-md bg-cobalt px-2 py-1 text-caption font-medium text-ivory">
              New
            </span>
            Email that waits for your okay
            <ChevronRight className="h-3.5 w-3.5 text-steel" aria-hidden="true" />
          </a>

          <h1 id="hero-title" className="headline-display mt-6">
            <span className="rise block text-ivory" style={rise(60)}>
              A personal assistant
            </span>
            <span className="rise block text-ash" style={rise(150)}>
              that lives in Telegram
            </span>
          </h1>

          <p className="rise mx-auto mt-6 max-w-xl text-body-lg text-ash" style={rise(240)}>
            Set reminders, draft and send email, browse the web, and run commands on its own Linux
            computer, all by sending a message.
          </p>

          <div className="rise mt-8 flex flex-wrap items-center justify-center gap-2" style={rise(310)}>
            <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer">
              Start on Telegram
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button href={DASHBOARD_URL} variant="secondary">
              Open dashboard
            </Button>
          </div>

          <p className="rise mt-4 text-xs text-steel" style={rise(370)}>
            Pro is $15/month, billed through the dashboard.
          </p>
        </div>

        <div className="fade-in mt-12 md:mt-14" style={rise(480)}>
          <HeroStage />
        </div>
      </Container>
    </section>
  );
}
