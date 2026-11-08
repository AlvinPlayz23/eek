import { Bell, Check, FileAudio } from "lucide-react";
import type { ReactNode } from "react";

// Scripted conversations for the product demo. Each message has the moment it appears; assistant
// messages also carry the moment their typing (or status) indicator starts, so the demo reads as
// a live exchange. Times are milliseconds from the start of the tab

export type DemoMessage = {
  from: "user" | "assistant";
  text: ReactNode;
  attach?: ReactNode;
  working?: string;
  at: number;
  typingAt?: number;
};

export type DemoTab = {
  id: string;
  label: string;
  title: string;
  description: string;
  messages: DemoMessage[];
  duration: number;
};

type Draft = Omit<DemoMessage, "at" | "typingAt">;

const timeline = (drafts: Draft[]) => {
  let clock = 500;
  const messages = drafts.map((draft): DemoMessage => {
    if (draft.from === "user") {
      const message = { ...draft, at: clock };
      clock += 1100;
      return message;
    }
    const typingAt = clock;
    const at = typingAt + (draft.working ? 1800 : 1100);
    clock = at + 1100;
    return { ...draft, typingAt, at };
  });
  const last = messages[messages.length - 1];
  return { messages, duration: last.at + 2600 };
};

const panel = "mt-2 rounded-md border border-fog/10 bg-surface-three px-2.5 py-2 text-xs";

const reminderCard = (
  <div className={`${panel} flex items-center justify-between gap-3`}>
    <span className="flex items-center gap-2 text-paper-white">
      <Bell className="h-3.5 w-3.5 text-mid-gray" aria-hidden="true" />
      Check my list
    </span>
    <span className="text-steel">Weekdays · 08:00</span>
  </div>
);

const draftCard = (
  <div className={panel}>
    <p className="text-caption text-steel">To: priya@example.com</p>
    <p className="mt-1 font-semibold text-paper-white">Re: Invoice numbers</p>
    <p className="mt-1 text-mid-gray">
      Hi Priya — I&rsquo;ll send the revised numbers on Monday morning.
    </p>
    <p className="mt-2 text-caption text-steel">Waiting for your okay</p>
  </div>
);

const sources = (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {["venue.example", "maps.example", "reviews.example"].map((site) => (
      <span key={site} className="rounded-full border border-fog/15 px-2 py-0.5 text-caption text-mid-gray">
        {site}
      </span>
    ))}
  </div>
);

const terminal = (
  <div className={`${panel} font-mono text-[11px] leading-5`}>
    <p className="text-paper-white">
      <span className="text-graphite">$ </span>ffmpeg -i talk.mp4 talk.mp3
    </p>
    <p className="text-steel">size=4210kB time=00:04:12</p>
    <p className="flex items-center gap-1.5 text-mid-gray">
      <Check className="h-3 w-3" aria-hidden="true" />
      done
    </p>
  </div>
);

const file = (
  <div className={`${panel} flex items-center gap-2.5`}>
    <span className="grid h-7 w-7 place-items-center rounded-md bg-surface-two">
      <FileAudio className="h-3.5 w-3.5 text-paper-white" aria-hidden="true" />
    </span>
    <span className="leading-tight">
      <span className="block font-medium text-paper-white">talk.mp3</span>
      <span className="block text-caption text-steel">4.2 MB</span>
    </span>
  </div>
);

export const demoTabs: DemoTab[] = [
  {
    id: "reminders",
    label: "Reminders",
    title: "Reminders",
    description:
      "Say when in plain language: “every weekday at 8”, “in 40 minutes”. Pause, edit or cancel from the same chat.",
    ...timeline([
      { from: "user", text: "Remind me every weekday at 8 to check my list." },
      {
        from: "assistant",
        text: "Done. Weekdays at 8:00, starting tomorrow.",
        attach: reminderCard,
      },
      { from: "user", text: "Pause it while I'm away." },
      {
        from: "assistant",
        text: "Paused. Say “resume” and it picks up from the next 8:00.",
      },
    ]),
  },
  {
    id: "email",
    label: "Email",
    title: "Email",
    description:
      "Search and read your Gmail, then ask for a draft. Nothing is sent until you confirm in a new message.",
    ...timeline([
      { from: "user", text: "Reply to Priya: I'll send the numbers Monday morning." },
      {
        from: "assistant",
        text: "Drafted a reply. Nothing is sent until you say so.",
        attach: draftCard,
      },
      { from: "user", text: "send it" },
      { from: "assistant", text: "Sent to priya@example.com. ✓" },
    ]),
  },
  {
    id: "web",
    label: "Web",
    title: "Web",
    description:
      "Ask about prices, opening hours or a page that won't load. It searches, reads the pages and answers with what it found.",
    ...timeline([
      { from: "user", text: "Is the venue open Sunday evening? Can I book?" },
      {
        from: "assistant",
        working: "Searching and reading 3 pages…",
        text: "Open 17:00–23:00 on Sundays. Bookings open 30 days ahead, and 19:30 still has tables.",
        attach: sources,
      },
      { from: "user", text: "Remind me to book on Friday." },
      { from: "assistant", text: "Done — Friday at 9:00." },
    ]),
  },
  {
    id: "computer",
    label: "Computer",
    title: "Its own computer",
    description:
      "A sandboxed Linux machine with a shell. It runs commands, keeps files, and sends the results back to the chat.",
    ...timeline([
      { from: "user", text: "Turn talk.mp4 into an mp3." },
      {
        from: "assistant",
        working: "Running on its computer…",
        text: "Done. Here's the file.",
        attach: (
          <>
            {terminal}
            {file}
          </>
        ),
      },
    ]),
  },
];
