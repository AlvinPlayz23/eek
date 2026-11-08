import { ArrowUp, ArrowUpRight, Pause, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Button } from "../components/button";
import { ChatBubble, WorkingBubble } from "../components/chat-bubble";
import { Container } from "../components/container";
import { LogoMark } from "../components/logo";
import { Reveal } from "../components/reveal";
import { Section } from "../components/section";
import { SectionHeader } from "../components/section-header";
import { demoTabs, type DemoMessage } from "../lib/demo";
import { useInView, usePrefersReducedMotion } from "../lib/hooks";
import { TELEGRAM_URL } from "../lib/links";

// Where the demo is at a given moment: how many messages are shown, and which one (if any) is
// still being "typed". Encoded as a string so React can skip identical frames
const stageAt = (messages: DemoMessage[], time: number) => {
  let shown = 0;
  let typing = -1;
  messages.forEach((message, index) => {
    if (message.at <= time) shown = index + 1;
    else if (message.typingAt !== undefined && message.typingAt <= time) typing = index;
  });
  return `${shown}:${typing}`;
};

function useSlidingPill(active: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  const measure = useCallback(() => {
    const node = listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[active];
    if (node) setPill({ x: node.offsetLeft, w: node.offsetWidth });
  }, [active]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return { listRef, pill };
}

export function ProductDemo() {
  const reduced = usePrefersReducedMotion();
  const { ref: panelRef, inView } = useInView<HTMLDivElement>({ threshold: 0.4, rootMargin: "0px" });
  const [tab, setTab] = useState(0);
  const [stage, setStage] = useState("0:-1");
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const clock = useRef(0);
  const bar = useRef<HTMLSpanElement>(null);
  const { listRef, pill } = useSlidingPill(tab);

  const current = demoTabs[tab];
  const playing = inView && !hovering && !userPaused && !reduced;
  const [shownText, typingText] = stage.split(":");
  const shown = reduced ? current.messages.length : Number(shownText);
  const typing = reduced ? -1 : Number(typingText);

  const select = useCallback((index: number) => {
    clock.current = 0;
    setStage("0:-1");
    setTab(index);
  }, []);

  // One clock drives the messages and the progress bar, so pausing freezes both together
  useEffect(() => {
    if (reduced) return;
    const { messages, duration } = demoTabs[tab];
    const paint = () => {
      bar.current?.style.setProperty("transform", `scaleX(${Math.min(clock.current / duration, 1)})`);
      setStage(stageAt(messages, clock.current));
    };
    paint();
    if (!playing) return;

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      clock.current += Math.min(now - last, 100);
      last = now;
      paint();
      if (clock.current >= duration) {
        select((tab + 1) % demoTabs.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tab, playing, reduced, select]);

  return (
    <Section id="chat" aria-labelledby="chat-title">
      <Container>
        <SectionHeader
          id="chat-title"
          line1="Everything happens in the chat"
          line2="No new app to learn"
          action={
            <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer" variant="secondary">
              Try it on Telegram
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          }
        />

        <div className="mt-12">
          <Reveal>
            <div
              ref={panelRef}
              className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-fog/10 bg-surface-one"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-fog/10 px-3 py-2.5 md:grid md:grid-cols-[1fr_auto_1fr]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <LogoMark />
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium text-paper-white">Personal assistant</p>
                    <p className="flex items-center gap-1.5 text-caption text-steel">
                      <span className="h-1.5 w-1.5 rounded-full bg-mid-gray" aria-hidden="true" />
                      online on Telegram
                    </p>
                  </div>
                </div>

                <div
                  ref={listRef}
                  role="tablist"
                  aria-label="What the assistant can do"
                  className="relative order-last flex w-full items-center justify-center gap-1 md:order-none md:w-auto"
                >
                  {pill ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 h-full rounded-md bg-surface-two transition-[transform,width] duration-300 ease-in-out motion-reduce:transition-none"
                      style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
                    />
                  ) : null}
                  {demoTabs.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      id={`demo-tab-${item.id}`}
                      aria-selected={index === tab}
                      aria-controls="demo-panel"
                      onClick={() => select(index)}
                      className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ease-out motion-reduce:transition-none ${
                        index === tab ? "text-paper-white" : "text-mid-gray hover:text-paper-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer" size="sm">
                    Open chat
                  </Button>
                </div>
              </div>

              <div
                id="demo-panel"
                role="tabpanel"
                aria-labelledby={`demo-tab-${current.id}`}
                className="bg-pure-black/60"
                onPointerEnter={(event) => event.pointerType === "mouse" && setHovering(true)}
                onPointerLeave={() => setHovering(false)}
              >
                <div
                  key={current.id}
                  className="tab-swap flex h-[380px] flex-col justify-end gap-2 overflow-hidden px-3 pb-4 pt-6 sm:h-[360px] md:px-5"
                >
                  {current.messages.slice(0, shown).map((message, index) => (
                    <ChatBubble key={index} from={message.from} animate={!reduced}>
                      {message.text}
                      {message.attach}
                    </ChatBubble>
                  ))}
                  {typing >= 0 ? <WorkingBubble label={current.messages[typing].working} /> : null}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-fog/10 px-3 py-2.5">
                <span className="flex-1 truncate rounded-md bg-surface-two px-3 py-2 text-xs text-steel">
                  Message Personal assistant…
                </span>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-electric-blue"
                  aria-hidden="true"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-paper-white" />
                </span>
              </div>
            </div>
          </Reveal>

          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center">
            <span aria-hidden="true" />
            <div className="flex justify-center gap-2" role="presentation">
              {demoTabs.map((item, index) => (
                <span key={item.id} className="h-[3px] w-11 overflow-hidden rounded-full bg-surface-three">
                  {index === tab ? (
                    <span
                      ref={bar}
                      className="block h-full origin-left rounded-full bg-paper-white"
                      style={{ transform: reduced ? "scaleX(1)" : "scaleX(0)" } as CSSProperties}
                    />
                  ) : null}
                </span>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setUserPaused((value) => !value)}
                aria-pressed={userPaused}
                aria-label={userPaused ? "Play the demo" : "Pause the demo"}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface-one text-paper-white transition-[background-color,transform] duration-150 ease-out hover:bg-surface-two active:scale-95 motion-reduce:hidden"
              >
                {userPaused ? (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {demoTabs.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => select(index)}
                aria-current={index === tab}
                className="group flex flex-col items-start text-left"
              >
                <span
                  className={`block text-body font-medium transition-colors duration-200 ease-out motion-reduce:transition-none ${
                    index === tab ? "text-paper-white" : "text-mid-gray group-hover:text-paper-white"
                  }`}
                >
                  {item.title}
                </span>
                <span
                  className={`mt-1 block text-body transition-colors duration-200 ease-out motion-reduce:transition-none ${
                    index === tab ? "text-mid-gray" : "text-steel group-hover:text-mid-gray"
                  }`}
                >
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
