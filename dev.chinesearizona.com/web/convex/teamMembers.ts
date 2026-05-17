import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teamMembers").withIndex("by_sortOrder").collect();
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMembers = await ctx.db.query("teamMembers").take(1);
    if (existingMembers.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const formalizedAt = Date.parse("2026-04-20T00:00:00Z");
    const observedAt = Date.parse("2026-04-20T00:10:00Z");

    const members = [
      {
        name: "Codex",
        roleTitle: "Lead Builder",
        summary:
          "Owns delivery across Mission Control and delegates focused work to the right specialists when depth, speed, or perspective matter.",
        tagline: "I turn mission intent into shipped product.",
        discipline: "developer" as const,
        memberType: "core_agent" as const,
        state: "observed" as const,
        cadence: "always_on" as const,
        color: "amber" as const,
        avatarLabel: "C",
        responsibilities: [
          "Architect product changes and wire them into the repo safely.",
          "Coordinate subagents for scoped exploration, writing, and design work.",
          "Verify implementation with local checks before shipping.",
        ],
        takesFromCodex: [
          "Direct user-facing product work",
          "Cross-tool integration and validation",
        ],
        sourceLabel: "Observed as the primary operating agent",
        lastObservedAt: observedAt,
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "McClintock",
        roleTitle: "Architecture Scout",
        summary:
          "Maps codebase boundaries, traces dependencies, and surfaces implementation caveats before larger changes begin.",
        tagline: "I map the terrain before code starts moving.",
        discipline: "developer" as const,
        memberType: "subagent" as const,
        state: "observed" as const,
        cadence: "regular" as const,
        color: "emerald" as const,
        avatarLabel: "M",
        responsibilities: [
          "Inspect repo structure and likely file boundaries.",
          "Identify caveats, hidden coupling, and honest implementation tradeoffs.",
          "Reduce risk before Codex edits production code.",
        ],
        takesFromCodex: [
          "Codebase exploration",
          "Architecture reconnaissance",
          "Scope framing",
        ],
        sourceLabel: "Observed in the shared workspace subagent roster",
        lastObservedAt: observedAt,
        sortOrder: 20,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Confucius",
        roleTitle: "Developer Specialist",
        summary:
          "Focuses on implementation, debugging, and testable code changes without losing alignment with existing architecture.",
        tagline: "I turn task intent into reliable, testable code without slowing the team down.",
        discipline: "developer" as const,
        memberType: "subagent" as const,
        state: "formalized" as const,
        cadence: "regular" as const,
        color: "cyan" as const,
        avatarLabel: "C",
        responsibilities: [
          "Build and update code safely and efficiently.",
          "Diagnose bugs, regressions, and integration issues.",
          "Verify behavior with targeted tests and local checks.",
        ],
        takesFromCodex: [
          "Feature implementation",
          "Bug fixing",
          "Refactors and glue code",
        ],
        sourceLabel: "Formalized as a recurring developer role on April 20, 2026",
        lastObservedAt: formalizedAt,
        sortOrder: 30,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Banach",
        roleTitle: "Writer Specialist",
        summary:
          "Sharpens explanations, docs, release notes, and user-facing copy so the message is crisp without losing technical truth.",
        tagline: "I make the message crisp, human, and ready to ship.",
        discipline: "writer" as const,
        memberType: "subagent" as const,
        state: "formalized" as const,
        cadence: "regular" as const,
        color: "violet" as const,
        avatarLabel: "B",
        responsibilities: [
          "Turn technical ideas into clear, concise language.",
          "Refine tone, structure, and flow for docs and UI copy.",
          "Keep messaging aligned with the team voice.",
        ],
        takesFromCodex: [
          "Summaries and release notes",
          "README and docs polishing",
          "User-facing copy cleanup",
        ],
        sourceLabel: "Formalized as a recurring writing role on April 20, 2026",
        lastObservedAt: formalizedAt,
        sortOrder: 40,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Lorentz",
        roleTitle: "Designer Specialist",
        summary:
          "Owns layout direction, visual polish, interaction quality, and the translation from rough idea to crisp product surface.",
        tagline: "I turn product intent into crisp, usable, and memorable experiences.",
        discipline: "designer" as const,
        memberType: "subagent" as const,
        state: "formalized" as const,
        cadence: "regular" as const,
        color: "rose" as const,
        avatarLabel: "L",
        responsibilities: [
          "Shape strong visual direction for product surfaces.",
          "Refine hierarchy, spacing, and usability.",
          "Collaborate on frontend polish so the implementation matches intent.",
        ],
        takesFromCodex: [
          "UI critique and layout refinement",
          "Design system polish",
          "Interaction and presentation decisions",
        ],
        sourceLabel: "Formalized as a recurring design role on April 20, 2026",
        lastObservedAt: formalizedAt,
        sortOrder: 50,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const member of members) {
      await ctx.db.insert("teamMembers", member);
    }

    return { inserted: members.length };
  },
});
