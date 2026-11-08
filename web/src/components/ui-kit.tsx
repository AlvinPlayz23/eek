import type React from "react";
import { AlertTriangleIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Platform, Reminder, ReminderStatus } from "@/lib/api";
import { platformName } from "@/lib/format";

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-[10px] font-medium uppercase leading-[1.4] tracking-[0.06em] text-ash",
        className
      )}
    >
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1
          className={cn(
            "text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[32px]",
            eyebrow && "mt-2"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.6] text-graphite">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section className={cn("panel", className)} style={style}>
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="text-[13px] font-semibold leading-none tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[8px] border border-destructive/20 bg-destructive/6 px-3 py-2 text-[12.5px] leading-[1.5] text-destructive-foreground"
    >
      <AlertTriangleIcon className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">{message}</span>
    </div>
  );
}

export function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-mist">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-graphite">
        {used}/{limit}
      </span>
    </div>
  );
}

export function PlatformTag({ platform }: { platform: Platform }) {
  return (
    <span className="inline-flex items-center rounded-full bg-mist px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-graphite">
      {platformName(platform)}
    </span>
  );
}

const STATUS_STYLES: Record<ReminderStatus, string> = {
  pending: "bg-brand-soft text-brand",
  paused: "bg-mist text-graphite",
  sent: "bg-success/10 text-success-foreground",
  canceled: "bg-mist text-ash",
  failed: "bg-destructive/8 text-destructive-foreground",
};

export function StatusPill({ reminder }: { reminder: Reminder }) {
  const label =
    reminder.status === "pending"
      ? "Active"
      : reminder.status === "paused"
        ? "Paused"
        : reminder.status === "sent"
          ? "Sent"
          : reminder.status === "canceled"
            ? "Canceled"
            : "Failed";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[reminder.status]
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      {icon ? (
        <div className="mb-2 grid size-9 place-items-center rounded-[12px] bg-mist text-graphite">
          {icon}
        </div>
      ) : null}
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-[40ch] text-[13px] leading-[1.55] text-graphite">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative block w-full", className)}>
      <select
        {...props}
        className="h-9 w-full appearance-none rounded-[6px] border border-input bg-card px-3 pr-9 text-[14px] text-ink outline-none transition-[border-color,box-shadow] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ash" />
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[12px] font-medium leading-none text-ink">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-[1.4] text-ash">{hint}</span> : null}
    </label>
  );
}
