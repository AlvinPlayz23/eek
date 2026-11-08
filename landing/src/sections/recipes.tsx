import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { ArrowButtons } from "../components/arrow-buttons";
import { Button } from "../components/button";
import { Container } from "../components/container";
import {
  DraftVisual,
  HoursVisual,
  InboxVisual,
  ProgressVisual,
  ReminderVisual,
  RepeatVisual,
  SearchVisual,
  TerminalVisual,
} from "../components/moments";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";
import { useCarousel } from "../lib/hooks";
import { TELEGRAM_URL } from "../lib/links";

const recipes: { title: string; prompt: string; visual: ReactNode }[] = [
  {
    title: "Weekly review",
    prompt: "Every Friday at 4, remind me to plan next week.",
    visual: <RepeatVisual title="Fridays" note="16:00 · Plan next week" active={[4]} />,
  },
  {
    title: "Catch up on email",
    prompt: "What did Priya send me this week?",
    visual: (
      <InboxVisual
        rows={[
          { from: "Priya", subject: "Re: Invoice numbers", time: "16:40" },
          { from: "Priya", subject: "Updated contract", time: "Tue" },
          { from: "Priya", subject: "Lunch on Thursday?", time: "Mon" },
        ]}
      />
    ),
  },
  {
    title: "Reply with a draft",
    prompt: "Draft a polite no to Thursday's invite.",
    visual: <DraftVisual to="events@example.com" subject="Re: Thursday evening" status="Waiting for “send it”" />,
  },
  {
    title: "Price check",
    prompt: "Cheapest direct flight to Lisbon in March?",
    visual: (
      <SearchVisual
        query="direct flights to Lisbon, March"
        rows={[
          { site: "skyfares.example", value: "€94" },
          { site: "flightdeals.example", value: "€108" },
          { site: "airlines.example", value: "€121" },
        ]}
      />
    ),
  },
  {
    title: "Convert a file",
    prompt: "Turn talk.mp4 into an mp3 and send it back.",
    visual: (
      <TerminalVisual
        lines={[
          { text: "ffmpeg -i talk.mp4 talk.mp3", tone: "cmd" },
          { text: "size=4210kB time=00:04:12", tone: "out" },
          { text: "done · talk.mp3 written", tone: "done" },
        ]}
      />
    ),
  },
  {
    title: "Opening hours",
    prompt: "Is the venue open on Sunday evening?",
    visual: (
      <HoursVisual
        highlight="Sun"
        rows={[
          { day: "Fri", hours: "12:00–23:00" },
          { day: "Sat", hours: "12:00–23:00" },
          { day: "Sun", hours: "17:00–23:00" },
        ]}
      />
    ),
  },
  {
    title: "Run something long",
    prompt: "Download the dataset and tell me when it's done.",
    visual: <ProgressVisual label="Downloading dataset" percent={68} note="I'll message you when done" />,
  },
  {
    title: "Morning brief",
    prompt: "On weekdays at 8, list what's on my plate.",
    visual: <ReminderVisual title="What's on my plate" time="8:00" when="Every weekday" />,
  },
];

export function Recipes() {
  const carousel = useCarousel();

  return (
    <Section id="recipes" aria-labelledby="recipes-title">
      <Container>
        <SectionHeader
          id="recipes-title"
          line1="Things to ask"
          line2="Copy one and send it"
          action={
            <>
              <ArrowButtons
                atStart={carousel.atStart}
                atEnd={carousel.atEnd}
                onPrev={carousel.prev}
                onNext={carousel.next}
                label="examples"
              />
              <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer" variant="secondary" className="ml-1">
                Try on Telegram
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          }
        />
      </Container>

      <div
        ref={carousel.ref}
        className="scroller mt-10"
        tabIndex={0}
        role="region"
        aria-label="Example requests"
      >
        {recipes.map((recipe) => (
          <article
            key={recipe.title}
            data-card
            className="w-[268px] shrink-0 rounded-lg border border-fog/15 bg-surface-one p-3 sm:w-[288px]"
          >
            <div className="h-[168px] overflow-hidden rounded-lg border border-fog/10 bg-pure-black">
              {recipe.visual}
            </div>
            <h3 className="mt-3 text-body font-semibold text-paper-white">{recipe.title}</h3>
            <p className="mt-1 text-xs text-mid-gray">&ldquo;{recipe.prompt}&rdquo;</p>
          </article>
        ))}
        <span aria-hidden="true" className="w-px shrink-0" />
      </div>
    </Section>
  );
}
