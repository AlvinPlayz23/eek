import { Bell, Check, FileAudio, Mail, Pause } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

// Small product vignettes. They stand in for the generated imagery of a gallery: each one is a
// real moment from the assistant's day, drawn from the same neutral surface stack as the page.
// Every visual fills its container, so the hero wall, recipe cards and trust cards share them

const days = ["M", "T", "W", "T", "F", "S", "S"];

export function ReminderVisual({
  title,
  time,
  when,
}: {
  title: string;
  time: string;
  when: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-two">
          <Bell className="h-3.5 w-3.5 text-paper-white" aria-hidden="true" />
        </span>
        <span className="truncate text-xs font-medium text-paper-white">{title}</span>
      </div>
      <div>
        <p className="text-[38px] font-bold leading-none tracking-[-0.062em] text-paper-white">{time}</p>
        <p className="mt-1.5 text-caption text-steel">{when}</p>
      </div>
    </div>
  );
}

export function RepeatVisual({
  label,
  active,
  tone = "dark",
}: {
  label: string;
  active: number[];
  tone?: "dark" | "light";
}) {
  const light = tone === "light";
  return (
    <div className="flex h-full flex-col justify-between p-3">
      <p className={`text-xs font-medium ${light ? "text-pure-black" : "text-paper-white"}`}>{label}</p>
      <div className="flex gap-[3px]">
        {days.map((day, index) => {
          const on = active.includes(index);
          const classes = light
            ? on
              ? "bg-pure-black text-paper-white"
              : "bg-pure-black/10 text-slate"
            : on
              ? "bg-paper-white text-pure-black"
              : "bg-surface-two text-steel";
          return (
            <span
              key={`${day}-${index}`}
              className={`grid h-[17px] w-[17px] place-items-center rounded-full text-[9px] font-semibold ${classes}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function DraftVisual({ to, subject, status }: { to: string; subject: string; status: string }) {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-caption text-steel">
          <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{to}</span>
        </span>
        <span className="shrink-0 rounded-full border border-fog/15 px-2 py-0.5 text-caption text-mid-gray">
          Draft
        </span>
      </div>
      <p className="mt-2.5 truncate text-xs font-semibold text-paper-white">{subject}</p>
      <div className="mt-2 space-y-1.5">
        <span className="block h-1.5 w-full rounded-full bg-surface-three" />
        <span className="block h-1.5 w-[86%] rounded-full bg-surface-three" />
        <span className="block h-1.5 w-[58%] rounded-full bg-surface-three" />
      </div>
      <p className="mt-auto text-caption text-steel">{status}</p>
    </div>
  );
}

export function SearchVisual({
  query,
  rows,
}: {
  query: string;
  rows: { site: string; value: string }[];
}) {
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <p className="truncate rounded-md bg-surface-two px-2.5 py-1.5 text-[11px] text-mist">{query}</p>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.site} className="flex items-center gap-2 text-[11px]">
            <span className="h-3 w-3 shrink-0 rounded-full bg-surface-three" />
            <span className="min-w-0 flex-1 truncate text-mid-gray">{row.site}</span>
            <span className="shrink-0 font-medium text-paper-white">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TerminalVisual({ lines }: { lines: { text: string; tone?: "cmd" | "out" | "done" }[] }) {
  return (
    <div className="h-full p-3 font-mono text-[11px] leading-5">
      {lines.map((line) => (
        <p
          key={line.text}
          className={`truncate ${
            line.tone === "cmd" ? "text-paper-white" : line.tone === "done" ? "text-mid-gray" : "text-steel"
          }`}
        >
          {line.tone === "cmd" ? <span className="text-graphite">$ </span> : null}
          {line.text}
        </p>
      ))}
    </div>
  );
}

export function FileVisual({ name, size }: { name: string; size: string }) {
  return (
    <div className="flex h-full flex-col items-start justify-between p-3">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-two">
        <FileAudio className="h-4 w-4 text-paper-white" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-medium text-paper-white">{name}</p>
        <p className="mt-0.5 text-caption text-steel">{size} · sent to chat</p>
      </div>
    </div>
  );
}

export function InboxVisual({ rows }: { rows: { from: string; subject: string; time: string }[] }) {
  return (
    <ul className="flex h-full flex-col justify-center gap-2 p-3">
      {rows.map((row) => (
        <li key={row.from} className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-three text-[10px] font-semibold text-paper-white">
            {row.from[0]}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[11px] font-medium text-paper-white">{row.from}</span>
            <span className="block truncate text-caption text-steel">{row.subject}</span>
          </span>
          <span className="shrink-0 text-caption text-graphite">{row.time}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProgressVisual({ label, percent, note }: { label: string; percent: number; note: string }) {
  return (
    <div className="flex h-full flex-col justify-between p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-paper-white">{label}</p>
        <Pause className="h-3 w-3 shrink-0 text-steel" aria-hidden="true" />
      </div>
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-three">
          <span className="block h-full rounded-full bg-paper-white" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-caption text-steel">
          {percent}% · {note}
        </p>
      </div>
    </div>
  );
}

export function SentVisual({ to, tone = "dark" }: { to: string; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <div className="flex h-full flex-col items-start justify-between p-3">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full ${light ? "bg-pure-black" : "bg-paper-white"}`}
      >
        <Check className={`h-4 w-4 ${light ? "text-paper-white" : "text-pure-black"}`} aria-hidden="true" />
      </span>
      <div>
        <p className={`text-body font-semibold ${light ? "text-pure-black" : "text-paper-white"}`}>Sent</p>
        <p className={`mt-0.5 truncate text-caption ${light ? "text-slate" : "text-steel"}`}>{to}</p>
      </div>
    </div>
  );
}

export function HoursVisual({
  rows,
  highlight,
}: {
  rows: { day: string; hours: string }[];
  highlight: string;
}) {
  return (
    <ul className="flex h-full flex-col justify-center gap-1 p-2.5">
      {rows.map((row) => {
        const on = row.day === highlight;
        return (
          <li
            key={row.day}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] ${
              on ? "bg-surface-two text-paper-white" : "text-steel"
            }`}
          >
            <span className="font-medium">{row.day}</span>
            <span>{row.hours}</span>
          </li>
        );
      })}
    </ul>
  );
}

// A framed vignette on the black canvas: 10px radius, hairline border, hover lift on pointer devices
export function Tile({
  width,
  tone = "dark",
  children,
  style,
}: {
  width: number;
  tone?: "dark" | "light";
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`group/tile h-[var(--tile-h)] shrink-0 overflow-hidden rounded-lg border ${
        tone === "light" ? "border-transparent bg-mist" : "border-fog/10 bg-surface-one"
      }`}
      style={{ width, ...style }}
    >
      <div className="h-full w-full transition-transform duration-500 ease-out group-hover/tile:scale-[1.03] motion-reduce:transition-none">
        {children}
      </div>
    </div>
  );
}
