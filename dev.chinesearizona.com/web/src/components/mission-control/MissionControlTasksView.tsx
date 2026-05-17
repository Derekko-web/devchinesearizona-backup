"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ChevronDown, Clock3, Loader, Plus, Search } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type TaskStatus = "recurring" | "backlog" | "in_progress" | "review" | "done";
type TaskAssignee =
  | "you"
  | "codex"
  | "mcclintock"
  | "confucius"
  | "banach"
  | "lorentz"
  | "unassigned";
type TaskPriority = "low" | "medium" | "high";
type AssigneeFilter = "all" | TaskAssignee;
type TaskDoc = Doc<"tasks">;

const STATUS_ORDER: TaskStatus[] = ["recurring", "backlog", "in_progress", "review", "done"];

const STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    dotClassName: string;
    emptyLabel: string;
  }
> = {
  recurring: {
    label: "Recurring",
    dotClassName: "bg-violet-400",
    emptyLabel: "no tasks",
  },
  backlog: {
    label: "Backlog",
    dotClassName: "bg-zinc-400",
    emptyLabel: "no tasks",
  },
  in_progress: {
    label: "In Progress",
    dotClassName: "bg-indigo-400",
    emptyLabel: "no tasks",
  },
  review: {
    label: "Review",
    dotClassName: "bg-amber-400",
    emptyLabel: "no tasks",
  },
  done: {
    label: "Done",
    dotClassName: "bg-emerald-400",
    emptyLabel: "no tasks",
  },
};

const ASSIGNEE_META: Record<
  TaskAssignee,
  {
    label: string;
    avatarClassName: string;
    avatarText: string;
  }
> = {
  you: {
    label: "You",
    avatarClassName: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/15",
    avatarText: "Y",
  },
  codex: {
    label: "Codex",
    avatarClassName: "bg-indigo-400/15 text-indigo-200 ring-1 ring-indigo-400/15",
    avatarText: "C",
  },
  mcclintock: {
    label: "McClintock",
    avatarClassName: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/15",
    avatarText: "M",
  },
  confucius: {
    label: "Confucius",
    avatarClassName: "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/15",
    avatarText: "C",
  },
  banach: {
    label: "Banach",
    avatarClassName: "bg-violet-400/15 text-violet-200 ring-1 ring-violet-400/15",
    avatarText: "B",
  },
  lorentz: {
    label: "Lorentz",
    avatarClassName: "bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/15",
    avatarText: "L",
  },
  unassigned: {
    label: "Unassigned",
    avatarClassName: "bg-white/8 text-zinc-300 ring-1 ring-white/10",
    avatarText: "U",
  },
};

const PRIORITY_META: Record<
  TaskPriority,
  {
    label: string;
    badgeClassName: string;
    dotClassName: string;
  }
> = {
  low: {
    label: "Low",
    badgeClassName: "border-white/8 bg-white/[0.02] text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
  medium: {
    label: "Medium",
    badgeClassName: "border-amber-400/15 bg-amber-400/[0.08] text-amber-200",
    dotClassName: "bg-amber-400",
  },
  high: {
    label: "High",
    badgeClassName: "border-rose-400/15 bg-rose-400/[0.08] text-rose-200",
    dotClassName: "bg-rose-400",
  },
};

const DEFAULT_FORM = {
  title: "",
  description: "",
  assignee: "codex" as TaskAssignee,
  status: "backlog" as TaskStatus,
  priority: "medium" as TaskPriority,
  project: "Mission Control",
};

const ASSIGNEE_FILTERS: Array<{ id: AssigneeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "you", label: "You" },
  { id: "codex", label: "Codex" },
  { id: "mcclintock", label: "McClintock" },
  { id: "confucius", label: "Confucius" },
  { id: "banach", label: "Banach" },
  { id: "lorentz", label: "Lorentz" },
];

const ASSIGNEE_OPTIONS: TaskAssignee[] = [
  "you",
  "codex",
  "mcclintock",
  "confucius",
  "banach",
  "lorentz",
  "unassigned",
];

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

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
  if (Math.abs(diff) < week) {
    return relativeTimeFormat.format(Math.round(diff / day), "day");
  }
  return relativeTimeFormat.format(Math.round(diff / week), "week");
}

function taskProjectLabel(task: TaskDoc) {
  return task.project?.trim() || "General";
}

function matchesSearch(task: TaskDoc, deferredSearch: string) {
  if (!deferredSearch) {
    return true;
  }

  const haystack = [
    task.title,
    task.description,
    task.project,
    ASSIGNEE_META[task.assignee].label,
    PRIORITY_META[task.priority].label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(deferredSearch);
}

export function MissionControlTasksView({ initialTasks }: { initialTasks: TaskDoc[] }) {
  const tasksQuery = useQuery(api.tasks.list);
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<Id<"tasks"> | null>(null);
  const [formState, setFormState] = useState(DEFAULT_FORM);

  const tasks = tasksQuery ?? initialTasks;
  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());

  const projectOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((task) => taskProjectLabel(task)))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [tasks],
  );

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesAssignee = assigneeFilter === "all" || task.assignee === assigneeFilter;
        const matchesProject = projectFilter === "all" || taskProjectLabel(task) === projectFilter;
        return matchesAssignee && matchesProject && matchesSearch(task, deferredSearch);
      }),
    [assigneeFilter, deferredSearch, projectFilter, tasks],
  );

  const columnTasks = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        tasks: visibleTasks.filter((task) => task.status === status),
      })),
    [visibleTasks],
  );

  const now = Date.now();
  const tasksThisWeek = tasks.filter((task) => now - task.createdAt < 7 * 24 * 60 * 60 * 1000).length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const completedCount = tasks.filter((task) => task.status === "done").length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formState.title.trim();

    if (!title) {
      return;
    }

    setIsCreating(true);

    try {
      await createTask({
        title,
        description: formState.description.trim() || undefined,
        assignee: formState.assignee,
        priority: formState.priority,
        project: formState.project.trim() || undefined,
        status: formState.status,
        createdBy: "mission-control",
      });

      startTransition(() => {
        setFormState(DEFAULT_FORM);
        setIsComposerOpen(false);
      });
    } finally {
      setIsCreating(false);
    }
  }

  function handleDrop(status: TaskStatus) {
    if (!draggedTaskId) {
      return;
    }

    const draggedTask = tasks.find((task) => task._id === draggedTaskId);
    setDraggedTaskId(null);

    if (!draggedTask || draggedTask.status === status) {
      return;
    }

    void updateTask({ id: draggedTask._id, status });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-6">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          {[
            { label: "This week", value: tasksThisWeek, tone: "text-emerald-300" },
            { label: "In progress", value: inProgressCount, tone: "text-indigo-300" },
            { label: "Total", value: tasks.length, tone: "text-white" },
            { label: "Completion", value: `${completionRate}%`, tone: "text-violet-300" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-3">
              <span className={`text-4xl font-semibold tracking-[-0.08em] ${stat.tone}`}>
                {stat.value}
              </span>
              <span className="text-sm text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#5b49ff] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#6b5bff]"
          >
            <Plus className="h-4 w-4" />
            New task
          </button>

          <div className="hidden h-6 w-px bg-white/8 xl:block" />

          <div className="flex flex-wrap items-center gap-2">
            {ASSIGNEE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setAssigneeFilter(filter.id as AssigneeFilter)}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  assigneeFilter === filter.id
                    ? "bg-white/[0.06] text-white"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative xl:min-w-[210px]">
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-white/8 bg-white/[0.02] px-4 pr-10 text-sm text-zinc-200 outline-none transition hover:border-white/12 focus:border-white/14"
            >
              <option value="all">All projects</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          </div>

          <label className="relative flex h-12 w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 text-sm text-zinc-400 xl:ml-auto xl:max-w-[280px]">
            <Search className="h-4 w-4 flex-none text-zinc-500" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search tasks"
              className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
            />
          </label>
        </div>

        {isComposerOpen ? (
          <form
            onSubmit={handleCreateTask}
            className="rounded-[24px] border border-white/8 bg-[#121217] px-4 py-4 lg:px-5 lg:py-5"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">
                    Title
                  </span>
                  <input
                    value={formState.title}
                    onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Track a new task"
                    className="w-full rounded-2xl border border-white/8 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none transition focus:border-white/16"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">
                    Description
                  </span>
                  <textarea
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={4}
                    placeholder="Add a short note"
                    className="w-full rounded-2xl border border-white/8 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none transition focus:border-white/16"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">
                    Assignee
                  </span>
                  <select
                    value={formState.assignee}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        assignee: event.target.value as TaskAssignee,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d12] px-4 text-sm text-white outline-none"
                  >
                    {ASSIGNEE_OPTIONS.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {ASSIGNEE_META[assignee].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">
                    Status
                  </span>
                  <select
                    value={formState.status}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        status: event.target.value as TaskStatus,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d12] px-4 text-sm text-white outline-none"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_META[status].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">
                    Priority
                  </span>
                  <select
                    value={formState.priority}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        priority: event.target.value as TaskPriority,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d12] px-4 text-sm text-white outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">
                    Project
                  </span>
                  <input
                    value={formState.project}
                    onChange={(event) => setFormState((current) => ({ ...current, project: event.target.value }))}
                    placeholder="Mission Control"
                    className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d12] px-4 text-sm text-white outline-none transition focus:border-white/16"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-zinc-500">
                New tasks appear immediately for every connected Mission Control session.
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
                  Create task
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </header>

      <section className="overflow-x-auto pb-2">
        <div className="grid min-w-[1140px] gap-5 xl:min-w-0 xl:grid-cols-5">
          {columnTasks.map(({ status, tasks: tasksForStatus }, index) => (
            <section
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(status)}
              className="flex min-h-[560px] flex-col"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].dotClassName}`} />
                  <h3 className="text-[0.98rem] font-medium text-zinc-100">{STATUS_META[status].label}</h3>
                  <span className="text-sm text-zinc-500">{tasksForStatus.length}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsComposerOpen(true);
                    setFormState((current) => ({ ...current, status }));
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
                  aria-label={`Add ${STATUS_META[status].label} task`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </header>

              <div className="mt-4 flex flex-1 flex-col gap-3">
                {tasksForStatus.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-zinc-600">
                    {STATUS_META[status].emptyLabel}
                  </div>
                ) : null}

                {tasksForStatus.map((task) => (
                  <article
                    key={task._id}
                    draggable
                    onDragStart={() => setDraggedTaskId(task._id)}
                    onDragEnd={() => setDraggedTaskId(null)}
                    className="group rounded-[18px] border border-white/8 bg-[#17171c] px-4 py-4 transition duration-200 hover:border-white/14 hover:bg-[#1b1b21]"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${PRIORITY_META[task.priority].dotClassName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-[1rem] font-medium text-white">{task.title}</h4>
                        {task.description ? (
                          <p className="mt-2 overflow-hidden text-sm leading-6 text-zinc-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                            {task.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                      <span className="inline-flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${ASSIGNEE_META[task.assignee].avatarClassName}`}
                        >
                          {ASSIGNEE_META[task.assignee].avatarText}
                        </span>
                        <span className="truncate text-[12px] font-medium text-zinc-400">
                          {ASSIGNEE_META[task.assignee].label}
                        </span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-zinc-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatRelativeTime(task.updatedAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-2 text-sm text-zinc-500 lg:flex-row lg:items-center lg:justify-between">
        <p>
          {visibleTasks.length === tasks.length
            ? `${tasks.length} tasks in view`
            : `Showing ${visibleTasks.length} of ${tasks.length} tasks`}
        </p>
        <p>Drag cards between columns to update status.</p>
      </footer>
    </div>
  );
}
