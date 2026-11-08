export type Card =
  | { kind: "reminder"; title: string; when: string }
  | { kind: "draft"; to: string; subject: string; body: string }
  | { kind: "flights"; rows: { airline: string; dates: string; price: string }[] }
  | { kind: "file"; name: string; size: string };

export type Message = {
  from: "user" | "bot";
  text?: string;
  attachment?: { name: string; size: string };
  card?: Card;
};

export const EXAMPLE_TABS = [
  { id: "reminder", label: "Reminder" },
  { id: "email", label: "Email draft" },
  { id: "flight", label: "Cheap flight" },
  { id: "video", label: "Video → MP3" },
];

export const CONVERSATIONS: Record<string, Message[]> = {
  reminder: [
    { from: "user", text: "Remind me to call the dentist tomorrow at 9." },
    {
      from: "bot",
      text: "Done. I’ll ping you tomorrow morning.",
      card: { kind: "reminder", title: "Call the dentist", when: "Tomorrow · 9:00 AM" },
    },
    { from: "user", text: "Actually make it 9:30" },
    { from: "bot", text: "Moved to 9:30. Nothing else changed." },
  ],
  email: [
    { from: "user", text: "Draft a note to Sam about the invoice." },
    {
      from: "bot",
      text: "Here’s a draft. It stays a draft until you tell me to send it.",
      card: {
        kind: "draft",
        to: "sam@northwind.studio",
        subject: "Invoice #2041",
        body: "Hi Sam — quick nudge on invoice #2041 from March. Could you let me know when it’s scheduled? Thanks!",
      },
    },
  ],
  flight: [
    { from: "user", text: "What’s the cheapest flight to Lisbon next month?" },
    {
      from: "bot",
      text: "From Gatwick, like last time. Cheapest return I found:",
      card: {
        kind: "flights",
        rows: [
          { airline: "easyJet", dates: "Tue 14 → Sun 19", price: "£94" },
          { airline: "TAP Air Portugal", dates: "Thu 9 → Mon 13", price: "£121" },
          { airline: "British Airways", dates: "Fri 17 → Tue 21", price: "£158" },
        ],
      },
    },
  ],
  video: [
    { from: "user", attachment: { name: "trip-recap.mov", size: "48.2 MB" } },
    { from: "user", text: "Turn this video into an MP3." },
    {
      from: "bot",
      text: "Converted on my machine. Here you go.",
      card: { kind: "file", name: "trip-recap.mp3", size: "4.1 MB · 3:12" },
    },
  ],
};

export const REASONS = [
  { lead: "It’s in a chat app you already use.", rest: "Not yet another tab to forget about." },
  {
    lead: "It asks before doing anything that can’t be undone.",
    rest: "Sending an email, deleting a reminder — you get the last word.",
  },
  { lead: "It’s fast and always on.", rest: "No “sorry, I was away”." },
];

export const STEPS = [
  { title: "Sign in once", body: "Connect Telegram, and Gmail if you want help with email." },
  { title: "Message the bot", body: "Plain English, the way you’d text a friend." },
  { title: "You’re set", body: "That’s the whole setup." },
];

export const FAQS = [
  {
    q: "Do I need to install anything?",
    a: "No. eek lives in Telegram. If you have Telegram, you already have everything you need.",
  },
  {
    q: "Can it send emails without asking me?",
    a: "No. It can search, read and draft in your Gmail, but nothing sends until you say so in a separate message.",
  },
  {
    q: "What does “its own computer” mean?",
    a: "eek has a real Linux machine it can run things on — converting files, crunching numbers, long jobs in the background — so you don’t have to.",
  },
  {
    q: "What does it remember?",
    a: "Your conversations, your preferences, and what you asked for last week — so you don’t have to repeat yourself.",
  },
  {
    q: "How do I cancel?",
    a: "From a simple dashboard, whenever you like. No phone tree, no retention call.",
  },
];
