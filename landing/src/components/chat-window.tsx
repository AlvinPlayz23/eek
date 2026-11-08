import { Bell, Download, Film, Lock, Music, Plane, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { CONVERSATIONS, EXAMPLE_TABS, type Card, type Message } from "../lib/content";
import { usePrefersReducedMotion } from "../lib/hooks";

const USER_BUBBLE =
  "rounded-[16px] rounded-br-[6px] bg-sky px-3.5 py-2 text-[14px] font-medium leading-snug text-night";
const BOT_BUBBLE =
  "rounded-[16px] rounded-bl-[6px] border-2 border-line bg-paper px-3.5 py-2 text-[14px] leading-snug text-ink";

// A scripted Telegram chat. Each example replays when picked: messages land one by one, with a
// typing indicator before every bot reply. Reduced motion shows the finished conversation
export function ChatWindow({ initialExample = "reminder" }: { initialExample?: string }) {
  const [active, setActive] = useState(initialExample in CONVERSATIONS ? initialExample : "reminder");
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const reduced = usePrefersReducedMotion();
  const messages = CONVERSATIONS[active];

  useEffect(() => {
    if (reduced) {
      setShown(messages.length);
      setTyping(false);
      return;
    }

    setShown(0);
    setTyping(false);
    const timers: number[] = [];
    let at = 450;
    messages.forEach((message, index) => {
      if (message.from === "bot") {
        timers.push(window.setTimeout(() => setTyping(true), at));
        at += 950;
        timers.push(
          window.setTimeout(() => {
            setTyping(false);
            setShown(index + 1);
          }, at)
        );
        at += 800;
      } else {
        timers.push(window.setTimeout(() => setShown(index + 1), at));
        at += 700;
      }
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active, run, reduced, messages]);

  const select = (id: string) => {
    setActive(id);
    setRun((value) => value + 1);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Examples"
        className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {EXAMPLE_TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`example-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="example-panel"
              onClick={() => select(tab.id)}
              className={`shrink-0 whitespace-nowrap rounded-full border-2 px-4 py-1.5 text-[14px] font-semibold transition-colors duration-150 motion-reduce:transition-none ${
                selected
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-pencil hover:border-faded hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[24px] border-2 border-line bg-paper">
        <div className="flex items-center gap-3 border-b-2 border-line px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky text-night">
            <Send className="h-[18px] w-[18px] -translate-x-px" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[16px] font-semibold leading-tight text-ink">eek</p>
            <p className="text-[12px] leading-tight text-pencil">{typing ? "typing…" : "bot"}</p>
          </div>
        </div>

        <div
          role="tabpanel"
          id="example-panel"
          aria-labelledby={`example-tab-${active}`}
          className="flex h-[440px] flex-col gap-3 overflow-hidden bg-cloud p-4 sm:h-[420px] sm:p-5"
        >
          {messages.slice(0, shown).map((message, index) => (
            <Bubble key={`${active}-${run}-${index}`} message={message} />
          ))}
          {typing ? <TypingBubble /> : null}
        </div>

        <div className="flex items-center gap-3 border-t-2 border-line px-4 py-3" aria-hidden="true">
          <span className="flex-1 rounded-full border-2 border-line px-4 py-2 text-[14px] text-pencil">
            Message
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky text-night">
            <Send className="h-4 w-4 -translate-x-px" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="msg-in flex">
      <span className={`${BOT_BUBBLE} flex items-center gap-1 py-3`} aria-label="eek is typing">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="typing-dot h-1.5 w-1.5 rounded-full bg-pencil"
            style={{ "--dot-delay": `${delay}ms` } as React.CSSProperties}
          />
        ))}
      </span>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.from === "user") {
    return (
      <div className="msg-in flex flex-col items-end gap-2">
        {message.attachment ? (
          <div className="flex items-center gap-3 rounded-[16px] rounded-br-[6px] bg-sky py-2.5 pl-2.5 pr-4 text-night">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-night/10">
              <Film className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold leading-tight">
                {message.attachment.name}
              </span>
              <span className="block tabular-nums text-[12px] leading-tight opacity-70">
                {message.attachment.size}
              </span>
            </span>
          </div>
        ) : null}
        {message.text ? <p className={USER_BUBBLE}>{message.text}</p> : null}
      </div>
    );
  }

  return (
    <div className="msg-in flex max-w-[94%] flex-col items-start gap-2">
      {message.text ? <p className={BOT_BUBBLE}>{message.text}</p> : null}
      {message.card ? <CardView card={message.card} /> : null}
    </div>
  );
}

function CardView({ card }: { card: Card }) {
  const shell = "w-[340px] max-w-full rounded-[16px] border-2 border-line bg-paper";

  switch (card.kind) {
    case "reminder":
      return (
        <div className={`${shell} flex items-center gap-3 p-4`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-storybook text-ink">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{card.title}</p>
            <p className="tabular-nums text-[12px] text-pencil">{card.when}</p>
          </div>
        </div>
      );

    case "draft":
      return (
        <div className={`${shell} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate tabular-nums text-[12px] text-pencil">To: {card.to}</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cloud px-2.5 py-1 tabular-nums text-[11px] text-pencil">
              <Lock className="h-3 w-3" aria-hidden="true" /> draft
            </span>
          </div>
          <p className="mt-2 text-[15px] font-semibold text-ink">{card.subject}</p>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-charcoal">{card.body}</p>
        </div>
      );

    case "flights":
      return (
        <div className={`${shell} divide-y-2 divide-line overflow-hidden`}>
          {card.rows.map((row, index) => (
            <div key={row.airline} className="flex items-center gap-3 px-4 py-3">
              <Plane
                className={`h-4 w-4 shrink-0 ${index === 0 ? "text-green-deep" : "text-pencil"}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{row.airline}</p>
                <p className="tabular-nums text-[12px] text-pencil">{row.dates}</p>
              </div>
              <p
                className={`shrink-0 tabular-nums text-[15px] font-semibold ${
                  index === 0 ? "rounded-full bg-storybook px-2.5 py-0.5 text-ink" : "text-ink"
                }`}
              >
                {row.price}
              </p>
            </div>
          ))}
        </div>
      );

    case "file":
      return (
        <div className={`${shell} flex items-center gap-3 p-3.5`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-wash text-ink">
            <Music className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{card.name}</p>
            <p className="tabular-nums text-[12px] text-pencil">{card.size}</p>
          </div>
          <Download className="h-4 w-4 shrink-0 text-pencil" aria-hidden="true" />
        </div>
      );
  }
}
