import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const taskStatus = v.union(
  v.literal("recurring"),
  v.literal("backlog"),
  v.literal("in_progress"),
  v.literal("review"),
  v.literal("done"),
);

const taskAssignee = v.union(
  v.literal("you"),
  v.literal("codex"),
  v.literal("mcclintock"),
  v.literal("confucius"),
  v.literal("banach"),
  v.literal("lorentz"),
  v.literal("unassigned"),
);

const taskPriority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

type TaskAssignee =
  | "you"
  | "codex"
  | "mcclintock"
  | "confucius"
  | "banach"
  | "lorentz"
  | "unassigned";

function normalizeText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function inferNamedAssignee(title: string, description?: string): Exclude<TaskAssignee, "you" | "unassigned"> {
  const haystack = `${normalizeText(title)} ${normalizeText(description)}`;

  if (/\b(office|team|refine|ui|design|layout|visual|polish|shell)\b/.test(haystack)) {
    return "lorentz";
  }

  if (/\b(memory|docs|copy|content|summary|writer|document)\b/.test(haystack)) {
    return "banach";
  }

  if (/\b(convex|deployment|schema|loading|fallback|architecture|infrastructure)\b/.test(haystack)) {
    return "mcclintock";
  }

  if (/\b(calendar|chat|hermes|realtime|fix|build|ship)\b/.test(haystack) || haystack.includes("task board") || haystack.includes("tasks board")) {
    return "confucius";
  }

  return "codex";
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    assignee: taskAssignee,
    priority: taskPriority,
    project: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("tasks", {
      ...args,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      project: args.project?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(taskStatus),
    assignee: v.optional(taskAssignee),
    priority: v.optional(taskPriority),
    project: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found.");
    }

    const patch: {
      title?: string;
      description?: string;
      status?: "recurring" | "backlog" | "in_progress" | "review" | "done";
      assignee?: TaskAssignee;
      priority?: "low" | "medium" | "high";
      project?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      patch.title = args.title.trim();
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim();
    }
    if (args.status !== undefined) {
      patch.status = args.status;
    }
    if (args.assignee !== undefined) {
      patch.assignee = args.assignee;
    }
    if (args.priority !== undefined) {
      patch.priority = args.priority;
    }
    if (args.project !== undefined) {
      patch.project = args.project.trim();
    }

    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingTasks = await ctx.db.query("tasks").take(1);
    if (existingTasks.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const seededTasks = [
      {
        title: "Provision local Convex deployment",
        description: "Keep Mission Control backed by a live local database instead of static mock data.",
        status: "done" as const,
        assignee: "mcclintock" as const,
        priority: "high" as const,
        project: "Mission Control",
        createdBy: "system",
        createdAt: now - 1000 * 60 * 48,
        updatedAt: now - 1000 * 60 * 6,
      },
      {
        title: "Build Mission Control workspace shell",
        description: "Create the dedicated app surface with sidebar navigation and Linear-style density.",
        status: "done" as const,
        assignee: "codex" as const,
        priority: "high" as const,
        project: "Mission Control",
        createdBy: "system",
        createdAt: now - 1000 * 60 * 40,
        updatedAt: now - 1000 * 60 * 5,
      },
      {
        title: "Ship the real-time tasks board",
        description: "Track status, assignee, and live edits for every active task in one place.",
        status: "done" as const,
        assignee: "confucius" as const,
        priority: "high" as const,
        project: "Mission Control",
        createdBy: "system",
        createdAt: now - 1000 * 60 * 35,
        updatedAt: now - 1000 * 60 * 4,
      },
      {
        title: "Track all new work here going forward",
        description: "Use this board as the shared operating surface for tasks assigned to you or Codex.",
        status: "in_progress" as const,
        assignee: "codex" as const,
        priority: "medium" as const,
        project: "Mission Control",
        createdBy: "system",
        createdAt: now - 1000 * 60 * 12,
        updatedAt: now - 1000 * 60 * 2,
      },
      {
        title: "Choose the second Mission Control tool",
        description: "Decide what custom tool should land after Tasks.",
        status: "backlog" as const,
        assignee: "you" as const,
        priority: "medium" as const,
        project: "Mission Control",
        createdBy: "system",
        createdAt: now - 1000 * 60 * 8,
        updatedAt: now - 1000 * 60 * 1,
      },
    ];

    for (const task of seededTasks) {
      await ctx.db.insert("tasks", task);
    }

    return { inserted: seededTasks.length };
  },
});

export const normalizeAssignees = mutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    let updated = 0;

    for (const task of tasks) {
      if (task.assignee === "you" || task.assignee === "unassigned") {
        continue;
      }

      const nextAssignee = inferNamedAssignee(task.title, task.description);

      if (nextAssignee === task.assignee) {
        continue;
      }

      await ctx.db.patch(task._id, {
        assignee: nextAssignee,
        updatedAt: task.updatedAt,
      });
      updated += 1;
    }

    return { updated };
  },
});
