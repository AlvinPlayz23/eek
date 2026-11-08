import { Bell, Check, Globe, Lock, Pause } from "lucide-react";
import type { ReactNode } from "react";

// Five capabilities, each told in words on one side and shown as the product on the other
export function Capabilities() {
  return (
    <div className="mt-16 space-y-20 lg:mt-20 lg:space-y-28">
      {ROWS.map((row, i) => (
        <div key={row.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <div className={`min-w-0 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
            <h3 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[34px]">
              {row.title}
            </h3>
            <p className="mt-4 max-w-[480px] text-[17px] leading-[1.6] text-pencil">{row.body}</p>
          </div>
          <div className={`min-w-0 ${i % 2 === 1 ? "lg:order-1" : ""}`}>{row.visual}</div>
        </div>
      ))}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-[24px] bg-cloud p-4 sm:p-8">{children}</div>;
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <p className="flex justify-end">
      <span className="rounded-[16px] rounded-br-[6px] bg-sky px-3.5 py-2 text-[14px] font-medium text-night">
        {children}
      </span>
    </p>
  );
}

function RemindersVisual() {
  const items = [
    { title: "Bins out", when: "Every 2nd Tue · 7:00 PM", paused: false },
    { title: "Take the bread out", when: "In 40 min", paused: false },
    { title: "Stand-up notes", when: "Weekdays · 8:00 AM", paused: true },
  ];
  return (
    <Panel>
      <div className="divide-y-2 divide-line overflow-hidden rounded-[16px] border-2 border-line bg-paper">
        {items.map((r) => (
          <div key={r.title} className="flex items-center gap-3 px-4 py-3.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${r.paused ? "bg-cloud text-pencil" : "bg-storybook text-ink"}`}
            >
              {r.paused ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-semibold ${r.paused ? "text-pencil" : "text-ink"}`}>{r.title}</p>
              <p className="tabular-nums text-[12px] text-pencil">{r.when}</p>
            </div>
            {r.paused && (
              <span className="rounded-full bg-cloud px-2.5 py-1 tabular-nums text-[11px] text-pencil">paused</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <UserBubble>pause stand-up till Monday</UserBubble>
      </div>
    </Panel>
  );
}

function EmailVisual() {
  return (
    <Panel>
      <div className="rounded-[16px] border-2 border-line bg-paper p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate tabular-nums text-[12px] text-pencil">To: sam@northwind.studio</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cloud px-2.5 py-1 tabular-nums text-[11px] text-pencil">
            <Lock className="h-3 w-3" aria-hidden="true" /> draft
          </span>
        </div>
        <p className="mt-2 text-[16px] font-semibold text-ink">Invoice #2041</p>
        <p className="mt-2 text-[15px] leading-[1.55] text-charcoal">
          Hi Sam — quick nudge on invoice #2041 from March. Could you let me know when it’s scheduled? Thanks!
        </p>
      </div>
      <div className="mt-4 space-y-2">
        <UserBubble>send it</UserBubble>
        <p className="flex">
          <span className="inline-flex items-center gap-2 rounded-[16px] rounded-bl-[6px] bg-night px-3.5 py-2 text-[14px] text-ivory">
            <Check className="h-4 w-4 text-green" aria-hidden="true" /> Sent to Sam.
          </span>
        </p>
      </div>
    </Panel>
  );
}

function WebVisual() {
  return (
    <Panel>
      <UserBubble>is Tasca da Esquina open sunday?</UserBubble>
      <div className="mt-3 rounded-[16px] border-2 border-line bg-paper p-5">
        <p className="text-[16px] font-semibold text-ink">Yes — lunch and dinner.</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 tabular-nums text-[13px]">
          <dt className="text-pencil">Lunch</dt>
          <dd className="text-ink">12:30 – 15:00</dd>
          <dt className="text-pencil">Dinner</dt>
          <dd className="text-ink">19:00 – 23:00</dd>
        </dl>
        <p className="mt-4 flex items-center gap-1.5 border-t-2 border-line pt-3 text-[13px] text-pencil">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" /> Checked their site just now
        </p>
      </div>
    </Panel>
  );
}

function ComputerVisual() {
  return (
    <Panel>
      <div className="mx-auto max-w-[520px]" aria-label="eek's computer running two jobs" role="img">
        {/* Monitor: bezel, screen, chin */}
        <div className="rounded-[20px] bg-night-2 p-2.5 sm:p-3">
          <div className="overflow-hidden rounded-[12px] bg-night tabular-nums text-[12px] leading-[1.8] sm:text-[13px]">
            <div className="flex items-center gap-3 border-b border-night-line px-4 py-2.5 text-night-mute">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-night-3" />
                <span className="h-2.5 w-2.5 rounded-full bg-night-3" />
                <span className="h-2.5 w-2.5 rounded-full bg-night-3" />
              </span>
              <span className="min-w-0 flex-1 truncate text-center">eek@machine</span>
              <span className="shrink-0">2 jobs</span>
            </div>
            <div className="px-4 py-4 text-ivory sm:px-5 sm:py-5">
              <p className="truncate">
                <span className="text-night-mute">$</span> ffmpeg -i trip-recap.mov trip-recap.mp3
              </p>
              <p className="text-green">✓ done · 4.1 MB</p>
              <p className="mt-3 truncate">
                <span className="text-night-mute">$</span> python totals.py expenses-2024.csv
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-night-3">
                  <div className="h-full w-[62%] rounded-full bg-sky" />
                </div>
                <span className="text-night-mute">62%</span>
              </div>
              <p className="mt-2 text-night-mute">running in the background — I’ll message you</p>
            </div>
          </div>
          <div className="flex justify-center pt-2" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
          </div>
        </div>
        {/* Stand */}
        <div className="mx-auto h-8 w-16 bg-night-3 sm:h-10 sm:w-20" aria-hidden="true" />
        <div className="mx-auto h-3 w-40 rounded-b-[10px] rounded-t-[6px] bg-night-2 sm:w-48" aria-hidden="true" />
      </div>
    </Panel>
  );
}

function MemoryVisual() {
  const facts = [
    "Flies from Gatwick, prefers a window seat",
    "Sam is the client at Northwind",
    "Dentist reminder moved to 9:30 last time",
    "Asked to renew passport before June",
  ];
  return (
    <Panel>
      <p className="text-[13px] font-medium text-pencil">What eek knows about you</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {facts.map((f) => (
          <li key={f} className="rounded-full border-2 border-line bg-paper px-3.5 py-2 text-[14px] text-ink">
            {f}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const ROWS = [
  {
    title: "Reminders that actually stick.",
    body: "“Every second Tuesday at 7”, “in 40 minutes”, “weekdays at 8” — it understands how you talk and remembers the repeats. Pause, resume, change your mind. No settings page anywhere.",
    visual: <RemindersVisual />,
  },
  {
    title: "Email without the fear.",
    body: "It can search and read your Gmail and write drafts for you. But nothing sends until you say so, in a separate message. Your inbox stays yours.",
    visual: <EmailVisual />,
  },
  {
    title: "It reads the web for you.",
    body: "Flight prices, opening hours, that page that won’t load — ask, and it comes back with the answer instead of a link dump.",
    visual: <WebVisual />,
  },
  {
    title: "It has its own computer.",
    body: "A real Linux machine it can run things on — converting files, crunching numbers, long jobs in the background. You ask; it works; you get on with your day.",
    visual: <ComputerVisual />,
  },
  {
    title: "It remembers you.",
    body: "Your conversations, your preferences, what you asked for last week. You never have to start from zero.",
    visual: <MemoryVisual />,
  },
];
