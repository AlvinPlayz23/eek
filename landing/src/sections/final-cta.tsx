import { ArrowRight } from "lucide-react";
import { Button } from "../components/button";
import { Container } from "../components/container";
import { Reveal } from "../components/reveal";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";

export function FinalCta() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="cta-title">
      <Container>
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 id="cta-title" className="headline-section">
              <span className="block text-ivory">Say hello on Telegram</span>
              <span className="block text-ash">It handles the rest</span>
            </h2>
            <p className="mt-5 text-body-lg text-ash">
              No downloads, no installs. The bot sends a sign-in link, you approve the code, and you
              are chatting.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                Start on Telegram
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button href={DASHBOARD_URL} variant="secondary">
                Open dashboard
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
