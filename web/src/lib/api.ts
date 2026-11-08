// The dashboard's typed view of the Hono API in src/dashboard. Everything is same-origin and
// authenticated with the app's own signed cookie, so the browser never handles a Clerk token.

export type Platform = "telegram" | "linq";

export type ReminderStatus = "pending" | "paused" | "sent" | "canceled" | "failed";

export type RepeatFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type RepeatSpec = {
  frequency: RepeatFrequency;
  interval?: number;
  weekdays?: number[];
  dayOfMonth?: number;
};

export type Reminder = {
  id: string;
  text: string;
  platform: Platform;
  status: ReminderStatus;
  dueAt: string;
  dueAtInput: string;
  nextLocal: string;
  timezone: string;
  repeat: string | null;
  repeatSpec: RepeatSpec | null;
  lastSentAt: string | null;
  lastSentLocal: string | null;
  createdAt: string;
};

export type DashboardChannel = {
  id: string;
  platform: Platform;
  handle: string;
  linkedAt: string;
  lastSeenAt: string | null;
  ready: boolean;
};

export type ReminderCounts = { upcoming: number; paused: number; past: number };

export type Quota = { used: number; limit: number };

export type ActivityItem = {
  id: string;
  kind: "message" | "reminder";
  platform: Platform;
  at: string;
  title: string;
};

export type Overview = {
  user: { email: string | null };
  pro: boolean | null;
  timezone: string | null;
  channels: DashboardChannel[];
  counts: ReminderCounts;
  quota: Quota;
  reminders: Reminder[];
  activity: ActivityItem[];
};

export type RemindersResponse = {
  tab: string;
  timezone: string | null;
  reminders: Reminder[];
  counts: ReminderCounts;
  quota: Quota;
};

export type SettingsResponse = {
  email: string | null;
  timezone: string | null;
  channels: DashboardChannel[];
  pro: boolean | null;
};

export type Billing = { pro: boolean | null; portalUrl: string };

export type DeviceStart = {
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
};

export type SignInPoll =
  | { status: "pending" | "slow_down" | "denied" | "expired" }
  | { status: "linked"; email: string | null };

export type CreateReminderInput = {
  text: string;
  channelId: string;
  timezone: string;
  dueAt: string;
  repeat: RepeatSpec | null;
};

export type UpdateReminderInput = {
  text?: string;
  dueAt?: string;
  repeat?: RepeatSpec | null;
};

export type GmailStatus = { connected: boolean; email: string | null };

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const BASE = "/api/dashboard";

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${BASE}${path}`, {
    credentials: "same-origin",
    ...init,
    headers,
  });

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Something went wrong. Try again.", res.status);
  }
  return data as T;
};

export const api = {
  me: () => request<{ user: { email: string | null }; expiresAt: number }>("/auth/me"),
  startSignIn: () => request<DeviceStart>("/auth/start", { method: "POST" }),
  pollSignIn: () => request<SignInPoll>("/auth/poll", { method: "POST" }),
  signOut: () => request<void>("/auth/sign-out", { method: "POST" }),

  overview: () => request<Overview>("/overview"),
  billing: () => request<Billing>("/billing"),

  reminders: (tab: string) => request<RemindersResponse>(`/reminders?tab=${tab}`),
  createReminder: (input: CreateReminderInput) =>
    request<{ reminder: Reminder }>("/reminders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateReminder: (id: string, input: UpdateReminderInput) =>
    request<{ reminder: Reminder }>(`/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  pauseReminder: (id: string) =>
    request<{ reminder: Reminder }>(`/reminders/${id}/pause`, { method: "POST" }),
  resumeReminder: (id: string) =>
    request<{ reminder: Reminder }>(`/reminders/${id}/resume`, { method: "POST" }),
  cancelReminder: (id: string) =>
    request<{ ok: true }>(`/reminders/${id}/cancel`, { method: "POST" }),

  settings: () => request<SettingsResponse>("/settings"),
  setTimezone: (timezone: string) =>
    request<{ timezone: string }>("/settings/timezone", {
      method: "PATCH",
      body: JSON.stringify({ timezone }),
    }),
  unlinkChannel: (id: string) =>
    request<void>(`/settings/channels/${id}`, { method: "DELETE" }),
  gmailStatus: () => request<GmailStatus>("/gmail/status"),
  gmailDisconnect: () => request<{ ok: true }>("/gmail/disconnect", { method: "POST" }),
  gmailConnectUrl: () => `${BASE}/gmail/connect`,
  deleteData: () =>
    request<{ ok: true }>("/settings/delete", {
      method: "POST",
      body: JSON.stringify({ confirm: "delete" }),
    }),
};

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";
