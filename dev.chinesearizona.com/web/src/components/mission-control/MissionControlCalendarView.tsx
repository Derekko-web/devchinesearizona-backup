"use client";

import { startTransition, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Command,
  Loader,
  Plus,
  Sparkles,
} from "lucide-react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type ScheduledItemDoc = Doc<"scheduledItems">;
type ScheduledItemCadence = "once" | "daily" | "weekly" | "biweekly" | "observed";
type ScheduledItemKind = "cron_job" | "scheduled_task" | "observed_automation";
type ScheduledItemOwner = "you" | "codex" | "system";
type ScheduledItemColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

type ScheduleFormState = {
  title: string;
  description: string;
  owner: ScheduledItemOwner;
  kind: ScheduledItemKind;
  cadence: ScheduledItemCadence;
  anchorInput: string;
  durationMinutes: string;
  color: ScheduledItemColor;
  project: string;
  sourcePath: string;
  command: string;
};

type CalendarOccurrence = {
  item: ScheduledItemDoc;
  at: number;
  dayIndex: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const COLOR_META: Record<
  ScheduledItemColor,
  {
    panelClassName: string;
    badgeClassName: string;
    dotClassName: string;
    textClassName: string;
  }
> = {
  indigo: {
    panelClassName: "border-indigo-400/20 bg-indigo-400/[0.08]",
    badgeClassName: "bg-indigo-400/12 text-indigo-200 ring-1 ring-indigo-400/18",
    dotClassName: "bg-indigo-300",
    textClassName: "text-indigo-200",
  },
  amber: {
    panelClassName: "border-amber-400/20 bg-amber-400/[0.08]",
    badgeClassName: "bg-amber-400/12 text-amber-200 ring-1 ring-amber-400/18",
    dotClassName: "bg-amber-300",
    textClassName: "text-amber-200",
  },
  emerald: {
    panelClassName: "border-emerald-400/20 bg-emerald-400/[0.08]",
    badgeClassName: "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/18",
    dotClassName: "bg-emerald-300",
    textClassName: "text-emerald-200",
  },
  rose: {
    panelClassName: "border-rose-400/20 bg-rose-400/[0.08]",
    badgeClassName: "bg-rose-400/12 text-rose-200 ring-1 ring-rose-400/18",
    dotClassName: "bg-rose-300",
    textClassName: "text-rose-200",
  },
  cyan: {
    panelClassName: "border-cyan-400/20 bg-cyan-400/[0.08]",
    badgeClassName: "bg-cyan-400/12 text-cyan-200 ring-1 ring-cyan-400/18",
    dotClassName: "bg-cyan-300",
    textClassName: "text-cyan-200",
  },
  violet: {
    panelClassName: "border-violet-400/20 bg-violet-400/[0.08]",
    badgeClassName: "bg-violet-400/12 text-violet-200 ring-1 ring-violet-400/18",
    dotClassName: "bg-violet-300",
    textClassName: "text-violet-200",
  },
};

const CADENCE_LABELS: Record<ScheduledItemCadence, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  observed: "Observed",
};

const OWNER_LABELS: Record<ScheduledItemOwner, string> = {
  you: "You",
  codex: "Codex",
  system: "System",
};

const DEFAULT_FORM: ScheduleFormState = {
  title: "",
  description: "",
  owner: "codex",
  kind: "scheduled_task",
  cadence: "weekly",
  anchorInput: "",
  durationMinutes: "45",
  color: "indigo",
  project: "Mission Control",
  sourcePath: "",
  command: "",
};

const EMPTY_SCHEDULED_ITEMS: ScheduledItemDoc[] = [];

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(timestamp: number) {
  const dayStart = startOfUtcDay(timestamp);
  const date = new Date(dayStart);
  return dayStart - date.getUTCDay() * DAY_MS;
}

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  if (Math.abs(diff) < day) {
    return relativeTimeFormat.format(Math.round(diff / hour), "hour");
  }
  return relativeTimeFormat.format(Math.round(diff / week), "week");
}

function formatScheduleTime(timestamp: number) {
  return `${timeFormatter.format(timestamp)} UTC`;
}

function formatAbsoluteRun(timestamp: number) {
  return `${fullDateFormatter.format(timestamp)} UTC`;
}

function getOccurrencesForWeek(item: ScheduledItemDoc, weekStart: number) {
  if (!item.isActive || item.cadence === "observed") {
    return [] as CalendarOccurrence[];
  }

  const occurrences: CalendarOccurrence[] = [];

  if (item.cadence === "once") {
    if (!item.anchorAt) {
      return occurrences;
    }
    const dayIndex = Math.floor((startOfUtcDay(item.anchorAt) - weekStart) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < 7) {
      occurrences.push({
        item,
        at: item.anchorAt,
        dayIndex,
      });
    }
    return occurrences;
  }

  if (item.cadence === "daily") {
    const startingDay = item.anchorAt ? Math.max(startOfUtcDay(item.anchorAt), weekStart) : weekStart;
    for (let dayStart = startingDay; dayStart < weekStart + 7 * DAY_MS; dayStart += DAY_MS) {
      const at = dayStart + (item.timeMinutes ?? 0) * MINUTE_MS;
      occurrences.push({
        item,
        at,
        dayIndex: Math.floor((dayStart - weekStart) / DAY_MS),
      });
    }
    return occurrences;
  }

  if (item.dayOfWeek === undefined) {
    return occurrences;
  }

  const occurrenceDayStart = weekStart + item.dayOfWeek * DAY_MS;
  const at = occurrenceDayStart + (item.timeMinutes ?? 0) * MINUTE_MS;

  if (item.anchorAt && at < item.anchorAt) {
    return occurrences;
  }

  if (item.cadence === "weekly") {
    occurrences.push({
      item,
      at,
      dayIndex: item.dayOfWeek,
    });
    return occurrences;
  }

  if (item.cadence === "biweekly" && item.anchorAt) {
    const anchorDay = startOfUtcDay(item.anchorAt);
    const diffDays = Math.round((occurrenceDayStart - anchorDay) / DAY_MS);
    if (diffDays >= 0 && diffDays % 14 === 0) {
      occurrences.push({
        item,
        at,
        dayIndex: item.dayOfWeek,
      });
    }
  }

  return occurrences;
}

function getNextOccurrence(item: ScheduledItemDoc, now: number) {
  if (!item.isActive || item.cadence === "observed") {
    return null;
  }

  if (item.cadence === "once") {
    return item.anchorAt && item.anchorAt >= now ? item.anchorAt : null;
  }

  if (item.cadence === "daily") {
    const dayStart = startOfUtcDay(now);
    const todayAt = dayStart + (item.timeMinutes ?? 0) * MINUTE_MS;
    if ((!item.anchorAt || todayAt >= item.anchorAt) && todayAt >= now) {
      return todayAt;
    }
    return todayAt + DAY_MS;
  }

  if (item.dayOfWeek === undefined) {
    return null;
  }

  if (item.cadence === "weekly") {
    const currentWeekStart = startOfUtcWeek(now);
    const candidate = currentWeekStart + item.dayOfWeek * DAY_MS + (item.timeMinutes ?? 0) * MINUTE_MS;
    if ((!item.anchorAt || candidate >= item.anchorAt) && candidate >= now) {
      return candidate;
    }
    return candidate + 7 * DAY_MS;
  }

  if (item.cadence === "biweekly" && item.anchorAt) {
    const anchorDayStart = startOfUtcDay(item.anchorAt);
    const anchorTimeOffset = (item.timeMinutes ?? 0) * MINUTE_MS;

    for (let dayStart = anchorDayStart; dayStart < now + 366 * DAY_MS; dayStart += 14 * DAY_MS) {
      const candidate = dayStart + anchorTimeOffset;
      if (candidate >= now) {
        return candidate;
      }
    }
  }

  return null;
}

export function MissionControlCalendarView({
  initialScheduledItems,
}: {
  initialScheduledItems: ScheduledItemDoc[];
}) {
  const scheduledItemsQuery = useQuery(api.scheduledItems.list);
  const createScheduledItem = useMutation(api.scheduledItems.create);
  const connectionState = useConvexConnectionState();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState<ScheduleFormState>(DEFAULT_FORM);

  const scheduledItems = scheduledItemsQuery ?? initialScheduledItems ?? EMPTY_SCHEDULED_ITEMS;
  const isLoading = scheduledItemsQuery === undefined && initialScheduledItems.length === 0;
  const isRealtime = connectionState.hasEverConnected && connectionState.isWebSocketConnected;

  const weekStart = useMemo(() => startOfUtcWeek(Date.now()), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => weekStart + index * DAY_MS), [weekStart]);

  const observedItems = scheduledItems.filter((item) => item.cadence === "observed");

  const weekOccurrences = useMemo(
    () =>
      scheduledItems
        .flatMap((item) => getOccurrencesForWeek(item, weekStart))
        .sort((left, right) => left.at - right.at),
    [scheduledItems, weekStart],
  );

  const occurrencesByDay = weekDays.map((_, dayIndex) =>
    weekOccurrences.filter((occurrence) => occurrence.dayIndex === dayIndex),
  );

  const upcomingItems = useMemo(() => {
    const now = Date.now();
    return scheduledItems
      .map((item) => {
        const nextOccurrence = getNextOccurrence(item, now);
        return nextOccurrence ? { item, nextOccurrence } : null;
      })
      .filter((value): value is { item: ScheduledItemDoc; nextOccurrence: number } => value !== null)
      .sort((left, right) => left.nextOccurrence - right.nextOccurrence)
      .slice(0, 6);
  }, [scheduledItems]);

  const scheduledThisWeek = weekOccurrences.length;
  const cronJobsCount = scheduledItems.filter((item) => item.kind === "cron_job" && item.isActive).length;
  const nextRun = upcomingItems[0]?.nextOccurrence ?? null;

  async function handleCreateScheduledItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formState.title.trim();

    if (!title) {
      return;
    }

    const anchorAt =
      formState.cadence === "observed" || !formState.anchorInput
        ? undefined
        : new Date(formState.anchorInput).getTime();

    if (formState.cadence !== "observed" && (!anchorAt || Number.isNaN(anchorAt))) {
      return;
    }

    const anchorDate = anchorAt ? new Date(anchorAt) : null;
    const timeMinutes = anchorDate ? anchorDate.getUTCHours() * 60 + anchorDate.getUTCMinutes() : undefined;
    const dayOfWeek = anchorDate ? anchorDate.getUTCDay() : undefined;
    const durationMinutes = Number.parseInt(formState.durationMinutes, 10);

    setIsCreating(true);

    try {
      await createScheduledItem({
        title,
        description: formState.description.trim() || undefined,
        kind: formState.kind,
        owner: formState.owner,
        cadence: formState.cadence,
        color: formState.color,
        project: formState.project.trim() || undefined,
        sourcePath: formState.sourcePath.trim() || undefined,
        command: formState.command.trim() || undefined,
        anchorAt,
        dayOfWeek: formState.cadence === "once" || formState.cadence === "observed" ? undefined : dayOfWeek,
        timeMinutes: formState.cadence === "observed" ? undefined : timeMinutes,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : undefined,
        lastObservedAt: formState.cadence === "observed" ? Date.now() : undefined,
        isActive: true,
      });

      startTransition(() => {
        setFormState(DEFAULT_FORM);
        setIsComposerOpen(false);
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.72rem] uppercase tracking-[0.32em] text-zinc-500">Scheduled operations</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-[2.75rem]">
              Calendar is the control surface for cron jobs and scheduled work.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 lg:text-base">
              Every automation runbook, recurring reminder, and future scheduled task should land here. Times below are
              rendered in UTC so cron anchors stay unambiguous.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsComposerOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" />
              New schedule
            </button>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin text-indigo-300" />
              ) : isRealtime ? (
                <CalendarDays className="h-4 w-4 text-emerald-300" />
              ) : (
                <Clock3 className="h-4 w-4 text-amber-300" />
              )}
              {isLoading ? "Loading schedule" : isRealtime ? "Week view" : "Snapshot loaded"}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Observed", value: observedItems.length, tone: "text-emerald-300" },
            { label: "This week", value: scheduledThisWeek, tone: "text-indigo-300" },
            { label: "Cron jobs", value: cronJobsCount, tone: "text-white" },
            {
              label: "Next run",
              value: nextRun ? timeFormatter.format(nextRun) : "--",
              tone: "text-violet-300",
            },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="mission-control-metric rounded-[26px] border border-white/6 bg-white/[0.025] px-4 py-5"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-semibold tracking-[-0.06em] ${stat.tone}`}>{stat.value}</span>
                <span className="text-sm text-zinc-500">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </header>

      <section className="mt-6 flex flex-col gap-4">
        {isComposerOpen ? (
          <form
            onSubmit={handleCreateScheduledItem}
            className="rounded-[28px] border border-indigo-400/18 bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(255,255,255,0.03))] p-4 lg:p-5"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Title</span>
                  <input
                    value={formState.title}
                    onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Schedule a new task or automation"
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Description</span>
                  <textarea
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={4}
                    placeholder="Why this schedule exists and what it should run"
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/40"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Owner</span>
                  <select
                    value={formState.owner}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        owner: event.target.value as ScheduledItemOwner,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="you">You</option>
                    <option value="codex">Codex</option>
                    <option value="system">System</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Type</span>
                  <select
                    value={formState.kind}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        kind: event.target.value as ScheduledItemKind,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="scheduled_task">Scheduled task</option>
                    <option value="cron_job">Cron job</option>
                    <option value="observed_automation">Observed automation</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Cadence</span>
                  <select
                    value={formState.cadence}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        cadence: event.target.value as ScheduledItemCadence,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="observed">Observed</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Color</span>
                  <select
                    value={formState.color}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        color: event.target.value as ScheduledItemColor,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="indigo">Indigo</option>
                    <option value="amber">Amber</option>
                    <option value="emerald">Emerald</option>
                    <option value="cyan">Cyan</option>
                    <option value="violet">Violet</option>
                    <option value="rose">Rose</option>
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Anchor run {formState.cadence === "observed" ? "(optional)" : "(required)"}
                  </span>
                  <input
                    type="datetime-local"
                    value={formState.anchorInput}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, anchorInput: event.target.value }))
                    }
                    disabled={formState.cadence === "observed"}
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Duration</span>
                  <input
                    value={formState.durationMinutes}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, durationMinutes: event.target.value }))
                    }
                    placeholder="45"
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Project</span>
                  <input
                    value={formState.project}
                    onChange={(event) => setFormState((current) => ({ ...current, project: event.target.value }))}
                    placeholder="Mission Control"
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/40"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Source path</span>
                  <input
                    value={formState.sourcePath}
                    onChange={(event) => setFormState((current) => ({ ...current, sourcePath: event.target.value }))}
                    placeholder="scripts/my_job/cron_sync.sh"
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/40"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-zinc-500">Command</span>
                  <input
                    value={formState.command}
                    onChange={(event) => setFormState((current) => ({ ...current, command: event.target.value }))}
                    placeholder="npm run my-scheduled-task"
                    className="w-full rounded-2xl border border-white/8 bg-[#09090b]/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/40"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">
                Recurring items use the anchor time to derive their UTC weekday and next run.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="rounded-full border border-white/8 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/12 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#09090b] transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Save schedule
                </button>
              </div>
            </div>
          </form>
        ) : null}

        <section className="rounded-[30px] border border-white/6 bg-[#0b0b10]/88">
          <div className="flex flex-col gap-4 border-b border-white/6 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Always Running</p>
              <p className="mt-1 text-sm text-zinc-500">Observed automations and wrappers that stay hot outside the weekly grid.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-zinc-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/8 px-3 py-2">
                <Command className="h-3.5 w-3.5 text-emerald-300" />
                Runtime observed
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/8 px-3 py-2">
                <Clock3 className="h-3.5 w-3.5 text-indigo-300" />
                All times UTC
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-4 py-4">
            {observedItems.length === 0 ? (
              <p className="text-sm text-zinc-500">No observed automations yet.</p>
            ) : null}
            {observedItems.map((item) => (
              <article
                key={item._id}
                className={`rounded-2xl border px-4 py-3 ${COLOR_META[item.color].panelClassName}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${COLOR_META[item.color].dotClassName}`} />
                  <p className="text-sm font-medium text-white">{item.title}</p>
                </div>
                <p className="mt-2 max-w-md text-sm text-zinc-300">{item.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className={`rounded-full px-2.5 py-1 ${COLOR_META[item.color].badgeClassName}`}>
                    {CADENCE_LABELS[item.cadence]}
                  </span>
                  <span>{item.project || "Mission Control"}</span>
                  {item.lastObservedAt ? <span>{formatRelativeTime(item.lastObservedAt)}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-white/6 bg-[#0b0b10]/88">
          <div className="flex flex-col gap-4 border-b border-white/6 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Scheduled Tasks</p>
              <p className="mt-1 text-sm text-zinc-500">Cron jobs and upcoming scheduled work for this UTC week.</p>
            </div>
            <div className="rounded-full border border-white/8 px-3 py-2 text-xs uppercase tracking-[0.24em] text-zinc-500">
              Week view
            </div>
          </div>

          <div className="overflow-x-auto px-3 py-3">
            <div className="grid min-w-[920px] grid-cols-7 gap-3">
              {weekDays.map((dayStart, index) => (
                <section
                  key={dayStart}
                  className="mission-control-column min-h-[250px] rounded-[24px] border border-white/6 bg-white/[0.03] px-3 py-3"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <header className="border-b border-white/6 pb-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{weekdayFormatter.format(dayStart)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{monthDayFormatter.format(dayStart)}</p>
                      <span className="text-sm text-zinc-500">{occurrencesByDay[index].length}</span>
                    </div>
                  </header>

                  <div className="mt-3 flex flex-col gap-3">
                    {occurrencesByDay[index].length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-white/8 px-3 py-8 text-center text-sm text-zinc-500">
                        No scheduled runs
                      </div>
                    ) : null}

                    {occurrencesByDay[index].map((occurrence) => (
                      <article
                        key={`${occurrence.item._id}-${occurrence.at}`}
                        className={`rounded-[20px] border px-3 py-3 ${COLOR_META[occurrence.item.color].panelClassName}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className={`text-xs font-medium uppercase tracking-[0.22em] ${COLOR_META[occurrence.item.color].textClassName}`}>
                            {formatScheduleTime(occurrence.at)}
                          </p>
                          <span className="text-xs text-zinc-400">
                            {occurrence.item.durationMinutes ? `${occurrence.item.durationMinutes}m` : "--"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-white">{occurrence.item.title}</p>
                        {occurrence.item.description ? (
                          <p className="mt-2 text-sm leading-6 text-zinc-300">{occurrence.item.description}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span className={`rounded-full px-2.5 py-1 ${COLOR_META[occurrence.item.color].badgeClassName}`}>
                            {CADENCE_LABELS[occurrence.item.cadence]}
                          </span>
                          <span>{occurrence.item.project || "Mission Control"}</span>
                          <span>{OWNER_LABELS[occurrence.item.owner]}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/6 bg-[#0b0b10]/88">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Next Up</p>
              <p className="mt-1 text-sm text-zinc-500">The next runs and reminders the system expects to execute.</p>
            </div>
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">Upcoming</div>
          </div>

          <div className="divide-y divide-white/6">
            {upcomingItems.length === 0 ? (
              <div className="px-4 py-8 text-sm text-zinc-500">No upcoming scheduled items yet.</div>
            ) : null}
            {upcomingItems.map(({ item, nextOccurrence }) => (
              <div key={item._id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${COLOR_META[item.color].dotClassName}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {item.command || item.sourcePath || item.description || "Scheduled item"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className={`rounded-full px-2.5 py-1 ${COLOR_META[item.color].badgeClassName}`}>
                    {CADENCE_LABELS[item.cadence]}
                  </span>
                  <span className="text-zinc-300">{formatAbsoluteRun(nextOccurrence)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 rounded-[28px] border border-white/6 bg-white/[0.025] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin text-indigo-300" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            )}
            <p className="text-sm text-zinc-300">
              {isLoading
                ? "Mission Control calendar is syncing with Convex."
                : "Scheduled work is live. Add future tasks here whenever they should run on a clock."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              {scheduledItems.filter((item) => item.isActive).length} active entries
            </span>
            {nextRun ? (
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-indigo-300" />
                next {formatScheduleTime(nextRun)}
              </span>
            ) : null}
          </div>
        </footer>
      </section>
    </>
  );
}
