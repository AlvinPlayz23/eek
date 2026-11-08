import type { ReactNode } from "react";
import {
  DraftCard,
  FileCard,
  NotificationCard,
  ReminderCard,
  SourcesCard,
  TerminalCard,
  ThreadCard,
} from "../components/cards";

// Scripted conversations for the hero stage. Message times are milliseconds from the start of the
// scene; assistant messages also carry the moment their typing (or status) indicator begins.
// Cards appear once enough messages are on screen, so they always land with the reply that
// produces them and can re-render as the conversation moves on

export type SceneMessage = {
  from: "user" | "assistant";
  text: string;
  working?: string;
  at: number;
  typingAt?: number;
};

export type SceneCard = {
  slot: "left" | "right";
  from: number;
  render: (shown: number) => ReactNode;
};

export type Scene = {
  id: string;
  label: string;
  caption: string;
  messages: SceneMessage[];
  cards: SceneCard[];
  duration: number;
};

type Draft = { from: "user" | "assistant"; text: string; working?: string; pause?: number };

const timeline = (drafts: Draft[]) => {
  let clock = 800;
  const messages = drafts.map((draft): SceneMessage => {
    const pause = draft.pause ?? 1200;
    if (draft.from === "user") {
      const message = { from: draft.from, text: draft.text, at: clock };
      clock += 700;
      return message;
    }
    const typingAt = clock;
    const at = typingAt + (draft.working ? 1800 : 1100);
    clock = at + pause;
    return { from: draft.from, text: draft.text, working: draft.working, typingAt, at };
  });
  return { messages, duration: messages[messages.length - 1].at + 3200 };
};

export const scenes: Scene[] = [
  {
    id: "reminders",
    label: "Reminders",
    caption: "Say when in plain language. Pause, edit or cancel from the same chat.",
    ...timeline([
      { from: "user", text: "Remind me every weekday at 8 to check my list." },
      { from: "assistant", text: "Done. Every weekday at 8:00, starting tomorrow.", pause: 2000 },
      { from: "user", text: "Pause it while I'm away." },
      { from: "assistant", text: "Paused. Say “resume” and it picks up from the next 8:00." },
    ]),
    cards: [
      { slot: "right", from: 2, render: (shown) => <ReminderCard paused={shown >= 4} /> },
      {
        slot: "left",
        from: 2,
        render: (shown) => (
          <NotificationCard title="Check my list" when="Tomorrow 8:00" muted={shown >= 4} />
        ),
      },
    ],
  },
  {
    id: "email",
    label: "Email",
    caption: "Search and read your Gmail, then ask for a draft. Nothing is sent until you confirm.",
    ...timeline([
      { from: "user", text: "Reply to Priya: I'll send the revised numbers Monday morning." },
      { from: "assistant", text: "Drafted a reply. Nothing is sent until you say so.", pause: 2200 },
      { from: "user", text: "send it" },
      { from: "assistant", text: "Sent to priya@example.com." },
    ]),
    cards: [
      { slot: "left", from: 2, render: () => <ThreadCard /> },
      {
        slot: "right",
        from: 2,
        render: (shown) => <DraftCard status={shown >= 4 ? "sent" : "waiting"} />,
      },
    ],
  },
  {
    id: "web",
    label: "Web",
    caption: "Ask about prices, opening hours or a page that won't load. It reads the pages and answers.",
    ...timeline([
      { from: "user", text: "Is the venue open Sunday evening? Can I book?" },
      {
        from: "assistant",
        working: "Searching and reading 3 pages…",
        text: "Open 17:00–23:00 on Sundays. Bookings open 30 days ahead, and 19:30 still has tables.",
        pause: 1800,
      },
      { from: "user", text: "Remind me to book on Friday." },
      { from: "assistant", text: "Done. Friday at 9:00." },
    ]),
    cards: [
      { slot: "right", from: 2, render: () => <SourcesCard /> },
      {
        slot: "left",
        from: 4,
        render: () => <NotificationCard title="Book the venue" when="Friday 9:00" />,
      },
    ],
  },
  {
    id: "computer",
    label: "Computer",
    caption: "A sandboxed Linux machine with a shell. It runs commands and sends the results back.",
    ...timeline([
      { from: "user", text: "Turn talk.mp4 into an mp3." },
      {
        from: "assistant",
        working: "Running on its computer…",
        text: "Done. Here's the file.",
      },
    ]),
    cards: [
      { slot: "right", from: 2, render: () => <TerminalCard /> },
      { slot: "left", from: 2, render: () => <FileCard /> },
    ],
  },
];
