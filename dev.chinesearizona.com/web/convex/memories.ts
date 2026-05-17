import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const memoryKind = v.union(
  v.literal("long_term"),
  v.literal("journal"),
  v.literal("decision"),
  v.literal("reference"),
);

const memoryColor = v.union(
  v.literal("indigo"),
  v.literal("amber"),
  v.literal("emerald"),
  v.literal("rose"),
  v.literal("cyan"),
  v.literal("violet"),
);

function normalizeText(value: string) {
  return value.trim();
}

function normalizeTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

function countWords(content: string) {
  const words = content.trim().match(/\S+/g);
  return words?.length ?? 0;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("memories").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
    content: v.string(),
    kind: memoryKind,
    color: memoryColor,
    tags: v.array(v.string()),
    sourcePath: v.optional(v.string()),
    documentDate: v.optional(v.number()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const content = normalizeText(args.content);

    return await ctx.db.insert("memories", {
      title: normalizeText(args.title),
      summary: args.summary ? normalizeText(args.summary) : undefined,
      content,
      kind: args.kind,
      color: args.color,
      tags: normalizeTags(args.tags),
      sourcePath: args.sourcePath ? normalizeText(args.sourcePath) : undefined,
      documentDate: args.documentDate,
      wordCount: countWords(content),
      pinned: args.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMemories = await ctx.db.query("memories").take(1);
    if (existingMemories.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const seedMemories = [
      {
        title: "Long-Term Memory",
        summary: "Mission Control is the shared operating system for work, schedules, and durable context.",
        content: `# Working Agreements

Mission Control is the shared operating surface for you and Codex.

- Every active job should be visible on the Tasks board with an owner and status.
- Every scheduled routine or cron-driven workflow should be visible on the Calendar.
- Important context, operating notes, and decisions should live in Memory as searchable documents.

# Architecture

- Frontend: Next.js app with dedicated Mission Control routes under /src/app/mission-control.
- Database: local Convex deployment for realtime updates across tools.
- Visual direction: dark, precise, Linear-inspired, and compact without feeling cramped.

# Current Workspace State

- Tasks is live and tracks assignee, priority, and status.
- Calendar is live and tracks explicit cron jobs plus observed automations.
- Memory is the searchable document layer for durable notes, decisions, and journals.`,
        kind: "long_term" as const,
        color: "violet" as const,
        tags: ["mission-control", "workflow", "realtime", "operating-system"],
        sourcePath: "src/components/mission-control",
        documentDate: now,
        pinned: true,
        createdAt: now - 1000 * 60 * 30,
        updatedAt: now - 1000 * 60 * 2,
      },
      {
        title: "Journal: 2026-04-19",
        summary: "Mission Control gained a searchable memory screen and the current tool set was captured as durable context.",
        content: `# Today

Mission Control now has three live surfaces: Tasks, Calendar, and Memory.

- Tasks tracks work in progress for you and Codex.
- Calendar tracks cron jobs, recurring schedules, and observed automations.
- Memory stores longer-form context in readable documents instead of scattering it across ad hoc notes.

# Notable Context

- Atlas Obscura Arizona sync is tracked as a weekly calendar item.
- Sunbird article sync is tracked as a biweekly calendar item.
- Arizona Radar automation is represented as an observed schedule entry so the workflow stays visible.

# Next Direction

Future custom tools should plug into the same shell so navigation, realtime storage, and team context stay unified.`,
        kind: "journal" as const,
        color: "indigo" as const,
        tags: ["journal", "today", "mission-control", "memory"],
        sourcePath: "src/app/mission-control",
        documentDate: Date.parse("2026-04-19T00:00:00Z"),
        pinned: false,
        createdAt: now - 1000 * 60 * 24,
        updatedAt: now - 1000 * 60 * 1,
      },
      {
        title: "Mission Control Decisions",
        summary: "Product and UX decisions that shape how the workspace should keep evolving.",
        content: `# Product Decisions

- Mission Control tools should feel like one system instead of separate admin pages.
- Realtime state belongs in Convex so updates can flow immediately into the UI.
- New tools should inherit the same shell, navigation, and operating language as Tasks and Calendar.

# UX Rules

- Density is good, but hierarchy needs to stay clear.
- Search should be immediate and forgiving across titles, tags, and body text.
- Documents should read like polished internal briefs, not like raw JSON or debug panes.

# Operating Principle

If a piece of context matters more than a single chat message, it belongs in Memory.`,
        kind: "decision" as const,
        color: "amber" as const,
        tags: ["decisions", "product", "ux", "mission-control"],
        sourcePath: "src/components/mission-control/MissionControlShell.tsx",
        documentDate: now,
        pinned: false,
        createdAt: now - 1000 * 60 * 20,
        updatedAt: now - 1000 * 60 * 4,
      },
      {
        title: "Automation Reference",
        summary: "A quick operator view of what the Calendar is currently tracking for scheduled work.",
        content: `# Scheduled Automations

- Atlas Obscura Arizona sync runs weekly and is stored from the repo cron wrapper.
- Sunbird article sync runs biweekly and is stored from its wrapper command.
- Arizona Radar automation is represented as observed runtime activity.

# Why This Matters

Calendar is the execution map. Memory captures the why, the interpretation, and the higher-level notes around those schedules.

# Rule

Any new scheduled task or cron job should be added to Calendar and, when needed, explained here with supporting context.`,
        kind: "reference" as const,
        color: "emerald" as const,
        tags: ["calendar", "automation", "cron", "operations"],
        sourcePath: "convex/scheduledItems.ts",
        documentDate: now,
        pinned: false,
        createdAt: now - 1000 * 60 * 18,
        updatedAt: now - 1000 * 60 * 6,
      },
      {
        title: "Hermes Runtime Snapshot",
        summary:
          "The local Arizona Radar runtime store shows Hermes completing regular runs on April 19, 2026, with intermittent ETIMEDOUT failures.",
        content: `# Runtime Store

The file-backed Arizona Radar store records Hermes runs throughout April 19, 2026.

- A completed run at 20:55 UTC found 6 candidates and published 1 item.
- Multiple runs completed with zero candidates, showing the pipeline is polling regularly.
- Several runs failed with the same spawnSync hermes ETIMEDOUT error.

# Supporting Evidence

- data/radar-runtime/store.json tracks run history and worker status.
- logs/arizona-radar-cron.log captures repeated ETIMEDOUT messages and fallback behavior.
- The Calendar should track the schedule itself, while Memory captures what those runs are doing in practice.

# Interpretation

This is the closest thing the repo currently has to a live operational memory trail for Hermes. It is useful, but it is not yet a full cross-agent memory archive.`,
        kind: "reference" as const,
        color: "cyan" as const,
        tags: ["hermes", "runtime", "arizona-radar", "operations"],
        sourcePath: "data/radar-runtime/store.json",
        documentDate: Date.parse("2026-04-19T21:40:01.691Z"),
        pinned: false,
        createdAt: now - 1000 * 60 * 15,
        updatedAt: now - 1000 * 60 * 3,
      },
    ];

    for (const memory of seedMemories) {
      await ctx.db.insert("memories", {
        ...memory,
        wordCount: countWords(memory.content),
      });
    }

    return { inserted: seedMemories.length };
  },
});
