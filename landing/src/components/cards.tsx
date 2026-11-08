import { Bell, Check, Globe, Play } from "lucide-react";
import { LogoMark } from "./logo";

// Result cards: the objects a reply produces. Each is drawn at readable size (12px and up) with
// plausible sample data, and sits inside a glass or obsidian surface supplied by the caller

const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

export function ReminderCard({ paused = false }: { paused?: boolean }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ivory">
          <Bell className="h-4 w-4 text-ash" aria-hidden="true" />
          Check my list
        </span>
        <span className="rounded-full border border-fog/15 px-2 py-0.5 text-caption text-ash">
          {paused ? "Paused" : "Repeats"}
        </span>
      </div>

      <p
        className={`mt-5 text-[40px] font-bold leading-none tracking-[-0.062em] text-ivory tabular-nums transition-opacity duration-300 ${
          paused ? "opacity-40" : ""
        }`}
      >
        8:00
      </p>

      <div className="mt-4 flex gap-1">
        {weekdays.map((day, index) => {
          const on = index < 5;
          return (
            <span
              key={`${day}-${index}`}
              className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold transition-colors duration-300 ${
                on
                  ? paused
                    ? "bg-surface-three text-ash"
                    : "bg-ivory text-onyx"
                  : "bg-surface-two/80 text-steel"
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-steel">{paused ? "Resumes when you ask" : "Next: tomorrow, 8:00"}</p>
    </div>
  );
}

export function NotificationCard({
  title,
  when,
  muted = false,
}: {
  title: string;
  when: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3.5 transition-opacity duration-300 ${muted ? "opacity-50" : ""}`}
    >
      <LogoMark className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[11px] text-ash">Personal assistant</p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-ivory">{title}</p>
      </div>
      <span className="shrink-0 self-start text-caption text-steel">{when}</span>
    </div>
  );
}

export function ThreadCard() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-three text-[11px] font-semibold text-ivory">
          P
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium text-ivory">Priya Nair</p>
          <p className="truncate text-[11px] text-steel">Re: Invoice numbers</p>
        </div>
        <span className="shrink-0 text-caption text-steel">16:40</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ash">
        Can you confirm the revised totals before Monday? I&rsquo;d like to close this out.
      </p>
    </div>
  );
}

export function DraftCard({ status }: { status: "waiting" | "sent" }) {
  const sent = status === "sent";
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-steel">Draft reply</span>
        <span className="flex items-center gap-1 rounded-full border border-fog/15 px-2 py-0.5 text-caption text-ash">
          {sent ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
          {sent ? "Sent" : "Draft"}
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex gap-3">
          <dt className="w-9 shrink-0 text-steel">To</dt>
          <dd className="truncate text-mist">Priya Nair</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-9 shrink-0 text-steel">Subject</dt>
          <dd className="truncate font-medium text-ivory">Re: Invoice numbers</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-ash">
        Hi Priya, I&rsquo;ll send the revised numbers on Monday morning.
      </p>

      <p className="mt-4 flex items-center gap-2 border-t border-fog/10 pt-3 text-[11px] text-steel">
        {sent ? (
          <>
            <Check className="h-3 w-3 text-ash" aria-hidden="true" />
            Sent to priya@example.com
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-ash" aria-hidden="true" />
            Waiting for your okay
          </>
        )}
      </p>
    </div>
  );
}

const sources = [
  { site: "venue.example", fact: "Sunday 17:00–23:00" },
  { site: "bookings.example", fact: "Opens 30 days ahead" },
  { site: "tables.example", fact: "19:30 has tables" },
];

export function SourcesCard() {
  return (
    <div className="p-4">
      <p className="flex items-center gap-2 text-[13px] font-medium text-ivory">
        <Globe className="h-4 w-4 text-ash" aria-hidden="true" />
        Read 3 pages
      </p>
      <ul className="mt-3 space-y-2.5">
        {sources.map((source) => (
          <li key={source.site} className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-three text-[10px] font-semibold uppercase text-ivory">
              {source.site[0]}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-xs text-mist">{source.site}</span>
              <span className="block truncate text-[11px] text-steel">{source.fact}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TerminalCard() {
  return (
    <div className="p-4 font-mono text-xs leading-5">
      <p className="text-ivory">
        <span className="text-graphite">$ </span>ffmpeg -i talk.mp4 talk.mp3
      </p>
      <p className="truncate text-steel">size=4210kB time=00:04:12</p>
      <p className="mt-1 flex items-center gap-1.5 text-ash">
        <Check className="h-3 w-3" aria-hidden="true" />
        talk.mp3 written
      </p>
    </div>
  );
}

const wave = [6, 12, 9, 16, 22, 14, 8, 18, 26, 20, 12, 7, 15, 24, 18, 10, 6, 13, 21, 17, 9, 5, 11, 19];

export function FileCard() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ivory">
          <Play className="ml-0.5 h-3.5 w-3.5 fill-onyx text-onyx" aria-hidden="true" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-medium text-ivory">talk.mp3</p>
          <p className="text-[11px] text-steel">4.2 MB · 4:12</p>
        </div>
      </div>
      <div className="mt-4 flex h-7 items-center gap-[3px]" aria-hidden="true">
        {wave.map((height, index) => (
          <span
            key={index}
            className={`w-[3px] rounded-full ${index < 9 ? "bg-ivory" : "bg-surface-three"}`}
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}
