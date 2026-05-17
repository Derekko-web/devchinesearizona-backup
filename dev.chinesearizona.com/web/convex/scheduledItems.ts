import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const scheduledItemKind = v.union(
  v.literal("cron_job"),
  v.literal("scheduled_task"),
  v.literal("observed_automation"),
);

const scheduledItemOwner = v.union(
  v.literal("you"),
  v.literal("codex"),
  v.literal("system"),
);

const scheduledItemCadence = v.union(
  v.literal("once"),
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("observed"),
);

const scheduledItemColor = v.union(
  v.literal("indigo"),
  v.literal("amber"),
  v.literal("emerald"),
  v.literal("rose"),
  v.literal("cyan"),
  v.literal("violet"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scheduledItems").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    kind: scheduledItemKind,
    owner: scheduledItemOwner,
    cadence: scheduledItemCadence,
    color: scheduledItemColor,
    project: v.optional(v.string()),
    sourcePath: v.optional(v.string()),
    command: v.optional(v.string()),
    anchorAt: v.optional(v.number()),
    dayOfWeek: v.optional(v.number()),
    timeMinutes: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    lastObservedAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("scheduledItems", {
      ...args,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      project: args.project?.trim() || undefined,
      sourcePath: args.sourcePath?.trim() || undefined,
      command: args.command?.trim() || undefined,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingItems = await ctx.db.query("scheduledItems").take(1);
    if (existingItems.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const seedItems = [
      {
        title: "Arizona Radar observed automation",
        description:
          "Observed from runtime store activity. Hermes-backed radar sweeps appear to run throughout the day behind a flock lock.",
        kind: "observed_automation" as const,
        owner: "codex" as const,
        cadence: "observed" as const,
        color: "emerald" as const,
        project: "Arizona Radar",
        sourcePath: "scripts/arizona_radar/cron_sync.sh",
        command: "node scripts/arizona_radar/run.cjs run",
        anchorAt: undefined,
        dayOfWeek: undefined,
        timeMinutes: undefined,
        durationMinutes: 10,
        lastObservedAt: Date.parse("2026-04-19T21:40:01.691Z"),
        isActive: true,
        createdAt: now - 1000 * 60 * 40,
        updatedAt: now - 1000 * 60 * 4,
      },
      {
        title: "Sunbird article sync",
        description:
          "Biweekly ingestion job for Sunbird article imports, anchored directly from the repo cron wrapper.",
        kind: "cron_job" as const,
        owner: "codex" as const,
        cadence: "biweekly" as const,
        color: "amber" as const,
        project: "Article Ingest",
        sourcePath: "scripts/article_ingest/cron_sync.sh",
        command: "npm run scrape:articles:sunbird",
        anchorAt: Date.parse("2026-04-20T03:17:00Z"),
        dayOfWeek: 1,
        timeMinutes: 3 * 60 + 17,
        durationMinutes: 105,
        lastObservedAt: undefined,
        isActive: true,
        createdAt: now - 1000 * 60 * 35,
        updatedAt: now - 1000 * 60 * 3,
      },
      {
        title: "Atlas Obscura Arizona sync",
        description:
          "Weekly Atlas ingest run using the shell wrapper checked into the repo. Stored here so the schedule stays visible in Mission Control.",
        kind: "cron_job" as const,
        owner: "codex" as const,
        cadence: "weekly" as const,
        color: "indigo" as const,
        project: "Atlas Obscura",
        sourcePath: "scripts/atlas_obscura_ingest/cron_sync.sh",
        command: "npm run atlas:sync",
        anchorAt: Date.parse("2026-04-20T04:00:00Z"),
        dayOfWeek: 1,
        timeMinutes: 4 * 60,
        durationMinutes: 90,
        lastObservedAt: undefined,
        isActive: true,
        createdAt: now - 1000 * 60 * 30,
        updatedAt: now - 1000 * 60 * 2,
      },
    ];

    for (const item of seedItems) {
      await ctx.db.insert("scheduledItems", item);
    }

    return { inserted: seedItems.length };
  },
});
