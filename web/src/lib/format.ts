import type { Platform, Reminder } from "@/lib/api";

export const platformName = (platform: Platform) =>
  platform === "telegram" ? "Telegram" : "iMessage";

export const statusLabel = (reminder: Reminder) => {
  switch (reminder.status) {
    case "pending":
      return "Active";
    case "paused":
      return "Paused";
    case "sent":
      return "Sent";
    case "canceled":
      return "Canceled";
    case "failed":
      return "Failed";
  }
};

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatter = (timeZone: string, options: Intl.DateTimeFormatOptions) => {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", { timeZone, ...options });
    formatters.set(key, formatter);
  }
  return formatter;
};

const safe = <T>(run: () => T, fallback: T): T => {
  try {
    return run();
  } catch {
    return fallback;
  }
};

export const shortDate = (iso: string, timeZone: string) =>
  safe(
    () =>
      formatter(timeZone, { weekday: "short", day: "numeric", month: "short" }).format(
        new Date(iso)
      ),
    iso.slice(0, 10)
  );

export const shortTime = (iso: string, timeZone: string) =>
  safe(
    () =>
      formatter(timeZone, {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(iso)),
    ""
  );

export const linkedOn = (iso: string) =>
  safe(
    () =>
      new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(iso)
      ),
    ""
  );

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const relativeTime = (iso: string) => {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
};

export const localNowLabel = (timeZone: string | null | undefined, at = new Date()) => {
  const zone = timeZone ?? undefined;
  const date = safe(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: zone,
      }).format(at),
    at.toDateString()
  );
  const time = safe(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: zone,
      }).format(at),
    ""
  );
  return `${date} · ${time}`;
};

export const browserTimeZone = () =>
  safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC");

const FALLBACK_ZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Lisbon",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

let zones: string[] | null = null;

export const timeZones = (): string[] => {
  if (zones) return zones;
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  zones = safe(() => (supported ? supported("timeZone") : FALLBACK_ZONES), FALLBACK_ZONES);
  return zones;
};

// "YYYY-MM-DDTHH:mm" values for the inputs, in the zone the reminder is scheduled in
export const zonedParts = (date: Date, timeZone: string) => {
  const parts = safe(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date),
    [] as Intl.DateTimeFormatPart[]
  );
  const read = (type: string, fallback: string) =>
    parts.find((part) => part.type === type)?.value ?? fallback;
  return {
    date: `${read("year", "1970")}-${read("month", "01")}-${read("day", "01")}`,
    time: `${read("hour", "00")}:${read("minute", "00")}`,
  };
};

// An hour from now, so a new reminder starts on a sensible round-ish default
export const defaultWhen = (timeZone: string) =>
  zonedParts(new Date(Date.now() + 60 * 60 * 1000), timeZone);

export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

// A channel handle is the user's own phone number or email: show enough to recognise it, not
// enough to copy from a shoulder-surfed screen
export const maskHandle = (handle: string, platform: Platform) => {
  if (handle.includes("@")) {
    const [local, domain] = handle.split("@");
    const name = local?.length && local.length > 2 ? `${local.slice(0, 2)}•••` : "•••";
    return `${name}@${domain ?? ""}`;
  }
  if (/^\+?\d{6,}$/.test(handle)) {
    return `${handle.slice(0, platform === "telegram" ? 2 : 3)}•••${handle.slice(-3)}`;
  }
  return handle.length > 6 ? `${handle.slice(0, 3)}•••` : handle;
};
