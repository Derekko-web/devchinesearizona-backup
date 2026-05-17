import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("officePresence").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingPresence = await ctx.db.query("officePresence").take(1);
    if (existingPresence.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();

    const entries = [
      {
        memberName: "Codex",
        status: "working" as const,
        area: "south_station" as const,
        currentTask: "Build the digital office screen",
        statusNote: "Shipping the new live Office tool into Mission Control.",
        activeTool: "Mission Control",
        isAtDesk: true,
        lastUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        memberName: "McClintock",
        status: "monitoring" as const,
        area: "north_station" as const,
        currentTask: "Trace implementation edges",
        statusNote: "Watching file boundaries and repo coupling around new tools.",
        activeTool: "Codebase",
        isAtDesk: true,
        lastUpdatedAt: now - 1000 * 60 * 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        memberName: "Confucius",
        status: "reviewing" as const,
        area: "west_station" as const,
        currentTask: "Check implementation quality",
        statusNote: "Reviewing behavior, data flow, and validation coverage.",
        activeTool: "Verification",
        isAtDesk: true,
        lastUpdatedAt: now - 1000 * 60 * 6,
        createdAt: now,
        updatedAt: now,
      },
      {
        memberName: "Banach",
        status: "writing" as const,
        area: "east_station" as const,
        currentTask: "Refine status copy",
        statusNote: "Keeping summaries, notes, and UI language crisp.",
        activeTool: "Docs",
        isAtDesk: true,
        lastUpdatedAt: now - 1000 * 60 * 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        memberName: "Lorentz",
        status: "designing" as const,
        area: "northeast_station" as const,
        currentTask: "Polish office layout",
        statusNote: "Dialing in hierarchy, desk scene balance, and visual rhythm.",
        activeTool: "Design system",
        isAtDesk: true,
        lastUpdatedAt: now - 1000 * 60 * 2,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const entry of entries) {
      await ctx.db.insert("officePresence", entry);
    }

    return { inserted: entries.length };
  },
});
