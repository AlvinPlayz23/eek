import { ArrowUp, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChatBubble, WorkingBubble } from "../components/chat-bubble";
import { Surface } from "../components/glass";
import { LogoMark } from "../components/logo";
import { useInView, usePrefersReducedMotion } from "../lib/hooks";
import { scenes, type SceneMessage } from "../lib/scenes";

// Where a scene is at a given moment: how many messages are on screen, and which one (if any) is
// still being "typed". Encoded as a string so React can skip identical frames
const stageAt = (messages: SceneMessage[], time: number) => {
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

export function HeroStage() {
  const reduced = usePrefersReducedMotion();
  const { ref: stageRef, inView } = useInView<HTMLDivElement>({ threshold: 0.35, rootMargin: "0px" });
  const [tab, setTab] = useState(0);
  const [stage, setStage] = useState("0:-1");
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const clock = useRef(0);
  const bar = useRef<HTMLSpanElement>(null);
  const { listRef, pill } = useSlidingPill(tab);

  const scene = scenes[tab];
  const playing = inView && !hovering && !userPaused && !reduced;
  const [shownText, typingText] = stage.split(":");
  const shown = reduced ? scene.messages.length : Number(shownText);
  const typing = reduced ? -1 : Number(typingText);

  const select = useCallback((index: number) => {
    clock.current = 0;
    setStage("0:-1");
    setTab(index);
  }, []);

  // One clock drives the messages and the progress line, so pausing freezes both together
  useEffect(() => {
    if (reduced) return;
    const { messages, duration } = scenes[tab];
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
        select((tab + 1) % scenes.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tab, playing, reduced, select]);

  const visibleCards = scene.cards.filter((card) => shown >= card.from);

  return (
    <div>
      <div
        ref={stageRef}
        id="demo-panel"
        role="tabpanel"
        aria-labelledby={`demo-tab-${scene.id}`}
        className="relative mx-auto max-w-[1000px]"
        onPointerEnter={(event) => event.pointerType === "mouse" && setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        <div className="obsidian sheen mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2.5 border-b border-fog/10 px-4 py-3">
            <LogoMark />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-paper-white">Personal assistant</p>
              <p className="text-caption text-steel">online on Telegram</p>
            </div>
          </div>

          <div
            key={scene.id}
            className="tab-swap flex h-[340px] flex-col justify-end gap-2 overflow-hidden px-4 pb-4 pt-6"
          >
            {scene.messages.slice(0, shown).map((message, index) => (
              <ChatBubble key={index} from={message.from} animate={!reduced}>
                {message.text}
              </ChatBubble>
            ))}
            {typing >= 0 ? <WorkingBubble label={scene.messages[typing].working} /> : null}
          </div>

          <div className="flex items-center gap-2 border-t border-fog/10 px-3 py-2.5">
            <span className="flex-1 truncate rounded-md bg-surface-two px-3 py-2 text-xs text-steel">
              Message Personal assistant
            </span>
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-electric-blue"
              aria-hidden="true"
            >
              <ArrowUp className="h-3.5 w-3.5 text-paper-white" />
            </span>
          </div>
        </div>

        <div className="pointer-events-none mt-3 min-h-[224px] lg:absolute lg:inset-0 lg:mt-0 lg:min-h-0">
          {visibleCards.map((card, index) => (
            <Surface
              key={`${scene.id}-${card.slot}`}
              variant="glass"
              data-slot={card.slot}
              style={{ animationDelay: `${index * 120}ms` }}
              className={`card-in pointer-events-auto rounded-2xl ${
                card.slot === "left"
                  ? "hidden lg:absolute lg:left-0 lg:top-[10%] lg:block lg:w-[268px]"
                  : "mx-auto w-full max-w-[460px] lg:absolute lg:right-0 lg:top-[30%] lg:mx-0 lg:w-[276px] lg:max-w-none"
              }`}
            >
              {card.render(shown)}
            </Surface>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        <div
          ref={listRef}
          role="tablist"
          aria-label="What the assistant can do"
          className="relative flex items-center gap-0.5 rounded-full bg-surface-one p-1"
        >
          {pill ? (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 h-[calc(100%-8px)] rounded-full bg-surface-three transition-[transform,width] duration-300 ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
            />
          ) : null}
          {scenes.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`demo-tab-${item.id}`}
              aria-selected={index === tab}
              aria-controls="demo-panel"
              onClick={() => select(index)}
              className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ease-out motion-reduce:transition-none ${
                index === tab ? "text-paper-white" : "text-mid-gray hover:text-paper-white"
              }`}
            >
              {item.label}
              {index === tab && !reduced ? (
                <span aria-hidden="true" className="absolute inset-x-4 bottom-0.5 h-px overflow-hidden">
                  <span ref={bar} className="block h-full origin-left bg-paper-white/70" style={{ transform: "scaleX(0)" }} />
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setUserPaused((value) => !value)}
          aria-pressed={userPaused}
          aria-label={userPaused ? "Play the demo" : "Pause the demo"}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface-one text-paper-white transition-[background-color,transform] duration-150 ease-out hover:bg-surface-two active:scale-95 motion-reduce:hidden"
        >
          {userPaused ? (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      <p
        key={scene.id}
        className="swap-in mx-auto mt-4 min-h-[42px] max-w-md text-center text-body text-mid-gray"
      >
        {scene.caption}
      </p>
    </div>
  );
}
