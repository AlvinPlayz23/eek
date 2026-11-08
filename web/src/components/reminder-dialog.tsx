import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, InlineError, NativeSelect } from "@/components/ui-kit";
import {
  api,
  errorMessage,
  type DashboardChannel,
  type Reminder,
  type RepeatFrequency,
  type RepeatSpec,
} from "@/lib/api";
import {
  browserTimeZone,
  defaultWhen,
  platformName,
  timeZones,
  weekdayOf,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const FREQUENCIES: { value: RepeatFrequency; label: string; unit: string }[] = [
  { value: "daily", label: "Daily", unit: "days" },
  { value: "weekly", label: "Weekly", unit: "weeks" },
  { value: "monthly", label: "Monthly", unit: "months" },
  { value: "yearly", label: "Yearly", unit: "years" },
];

const WEEKDAYS = [
  { value: 0, short: "S", long: "Sunday" },
  { value: 1, short: "M", long: "Monday" },
  { value: 2, short: "T", long: "Tuesday" },
  { value: 3, short: "W", long: "Wednesday" },
  { value: 4, short: "T", long: "Thursday" },
  { value: 5, short: "F", long: "Friday" },
  { value: 6, short: "S", long: "Saturday" },
];

type Frequency = RepeatFrequency | "none" | "custom";

export function ReminderDialog({
  open,
  onOpenChange,
  editing,
  channels,
  timezone,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Reminder | null;
  channels: DashboardChannel[];
  timezone: string | null;
  onSaved: () => void;
}) {
  const readyChannels = channels.filter((channel) => channel.ready);

  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [zone, setZone] = useState(browserTimeZone());
  const [channelId, setChannelId] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("none");
  const [interval, setInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [repeatDirty, setRepeatDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The dialog stays mounted between opens, so every open resets the form from the reminder
  // being edited (or a sensible default) rather than showing the last draft
  useEffect(() => {
    if (!open) return;

    const reminderZone = editing?.timezone ?? timezone ?? browserTimeZone();
    const when = editing
      ? { date: editing.dueAtInput.slice(0, 10), time: editing.dueAtInput.slice(11, 16) }
      : defaultWhen(reminderZone);
    const spec = editing?.repeatSpec ?? null;
    const customRepeat = Boolean(editing?.repeat && !editing.repeatSpec);
    const firstReady = channels.find((channel) => channel.ready)?.id ?? "";

    setText(editing?.text ?? "");
    setDate(when.date);
    setTime(when.time);
    setZone(reminderZone);
    setChannelId(firstReady);
    setFrequency(customRepeat ? "custom" : spec?.frequency ?? "none");
    setInterval(spec?.interval ?? 1);
    setWeekdays(spec?.weekdays ?? []);
    setDayOfMonth(spec?.dayOfMonth ? String(spec.dayOfMonth) : "");
    setRepeatDirty(false);
    setError(null);
    setSaving(false);
  }, [channels, editing, open, timezone]);

  const toggleWeekday = (day: number) => {
    setRepeatDirty(true);
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return setError("Write the reminder.");
    if (!date || !time) return setError("Choose a date and time.");
    if (!editing && !channelId) return setError("Choose a channel to deliver to.");

    const repeat: RepeatSpec | null =
      frequency === "none" || frequency === "custom"
        ? null
        : {
            frequency,
            ...(interval > 1 ? { interval } : {}),
            ...(frequency === "weekly" && weekdays.length > 0 ? { weekdays } : {}),
            ...(frequency === "monthly" && dayOfMonth
              ? { dayOfMonth: Number(dayOfMonth) }
              : {}),
          };

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        // Leave repeats untouched unless the controls actually changed. This preserves rules
        // created elsewhere that this form cannot represent.
        const repeatChanged = repeatDirty && frequency !== "custom";
        await api.updateReminder(editing.id, {
          text: text.trim(),
          dueAt: `${date}T${time}`,
          ...(repeatChanged ? { repeat } : {}),
        });
      } else {
        await api.createReminder({
          text: text.trim(),
          channelId,
          timezone: zone,
          dueAt: `${date}T${time}`,
          repeat,
        });
      }
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const unit = FREQUENCIES.find((entry) => entry.value === frequency)?.unit ?? "days";
  const selectedDateWeekday = date ? weekdayOf(date) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <form className="flex min-h-0 flex-col" onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit reminder" : "New reminder"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes apply from the next occurrence. A paused reminder stays paused."
                : "The assistant sends it to your chat, then advances a repeating series."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
            <Field label="What should I remind you about?">
              <Textarea
                autoFocus
                rows={2}
                value={text}
                maxLength={1000}
                placeholder="Call the dentist"
                onChange={(event) => setText(event.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>
              <Field label="Time">
                <Input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </Field>
            </div>

            {editing ? (
              <p className="text-[11px] text-ash">
                Scheduled in {editing.timezone}
              </p>
            ) : (
              <Field
                label="Timezone"
                hint="The reminder keeps this timezone. Your profile only changes if it has none yet."
              >
                <NativeSelect value={zone} onChange={(event) => setZone(event.target.value)}>
                  {timeZones().map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}

            {!editing ? (
              <Field
                label="Deliver to"
                hint={
                  readyChannels.length === 0
                    ? "Send the assistant a message on a linked channel first, so it has a conversation to deliver to."
                    : undefined
                }
              >
                <NativeSelect
                  value={channelId}
                  disabled={readyChannels.length === 0}
                  onChange={(event) => setChannelId(event.target.value)}
                >
                  {readyChannels.length === 0 ? (
                    <option value="">No channel ready yet</option>
                  ) : null}
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id} disabled={!channel.ready}>
                      {platformName(channel.platform)}
                      {channel.ready ? "" : " — message first"}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}

            <div className="rounded-[12px] bg-fog p-3 ring-1 ring-hairline/60">
              <div className="flex flex-col gap-3">
                <Field label="Repeat">
                  <NativeSelect
                    value={frequency}
                    onChange={(event) => {
                      setFrequency(event.target.value as Frequency);
                      setRepeatDirty(true);
                    }}
                  >
                    <option value="none">Does not repeat</option>
                    {editing?.repeat && !editing.repeatSpec ? (
                      <option value="custom">Custom (kept as-is)</option>
                    ) : null}
                    {FREQUENCIES.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>

                {frequency === "custom" ? (
                  <p className="text-[11px] leading-[1.4] text-ash">
                    This repeat was created elsewhere. Leave it selected to keep the original
                    rule, or choose a new repeat to replace it.
                  </p>
                ) : null}

                {frequency !== "none" && frequency !== "custom" ? (
                  <div className="flex flex-col gap-3">
                    <Field label={`Every ${interval} ${unit}`}>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={interval}
                        onChange={(event) => {
                          setRepeatDirty(true);
                          setInterval(Math.max(1, Number(event.target.value) || 1));
                        }}
                      />
                    </Field>

                    {frequency === "weekly" ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[12px] font-medium leading-none text-ink">
                          Days
                        </span>
                        <div className="flex gap-1.5">
                          {WEEKDAYS.map((day) => {
                            const selected = weekdays.includes(day.value);
                            return (
                              <button
                                key={day.long}
                                type="button"
                                aria-pressed={selected}
                                aria-label={day.long}
                                onClick={() => toggleWeekday(day.value)}
                                className={cn(
                                  "grid size-8 place-items-center rounded-[6px] text-[12px] font-medium outline-none transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-brand",
                                  selected
                                    ? "bg-ink text-background"
                                    : "bg-card text-graphite ring-1 ring-hairline hover:text-ink"
                                )}
                              >
                                {day.short}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[11px] leading-[1.4] text-ash">
                          {weekdays.length > 0
                            ? "Repeats on the selected days."
                            : `Defaults to the weekday of ${selectedDateWeekday === null ? "the date" : "the chosen date"}.`}
                        </span>
                      </div>
                    ) : null}

                    {frequency === "monthly" ? (
                      <Field label="Day of month" hint="Leave blank to use the date above.">
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={dayOfMonth}
                          placeholder={date ? date.slice(8, 10) : "1"}
                          onChange={(event) => {
                            setRepeatDirty(true);
                            setDayOfMonth(event.target.value);
                          }}
                        />
                      </Field>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <InlineError message={error} />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" loading={saving}>
              {editing ? "Save changes" : "Create reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
