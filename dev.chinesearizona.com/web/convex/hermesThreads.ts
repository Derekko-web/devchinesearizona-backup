import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function buildHermesReply(content: string, threadTitle: string) {
  const normalized = content.toLowerCase();

  if (normalized.includes("status") || normalized.includes("live")) {
    return `Status is live. ${threadTitle} is backed by Convex, so the thread should stay current across reloads.`;
  }

  if (normalized.includes("test") || normalized.includes("verify")) {
    return "I can keep this thread pinned to the real data path and use it as a clean verification surface.";
  }

  if (normalized.includes("ship") || normalized.includes("launch")) {
    return "Copy that. I will keep the interface tight and the history readable while this lands.";
  }

  if (normalized.includes("task") || normalized.includes("todo")) {
    return "If you want, I can turn that into a tracked Mission Control work item next.";
  }

  return `Acknowledged. I’ve logged that in ${threadTitle} and kept the chat state live in Convex.`;
}

export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hermesThreads").withIndex("by_lastMessageAt").order("desc").collect();
  },
});

export const listMessages = query({
  args: {
    threadId: v.id("hermesThreads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hermesMessages")
      .withIndex("by_threadId_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.id("hermesThreads"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);

    if (!thread) {
      throw new Error("Hermes thread not found.");
    }

    const content = args.content.trim();
    if (!content) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const userMessageId = await ctx.db.insert("hermesMessages", {
      threadId: args.threadId,
      role: "user",
      author: "You",
      content,
      createdAt: now,
    });

    const assistantContent = buildHermesReply(content, thread.title);
    const assistantMessageId = await ctx.db.insert("hermesMessages", {
      threadId: args.threadId,
      role: "assistant",
      author: "Hermes",
      content: assistantContent,
      createdAt: now + 1,
    });

    const title =
      thread.title === "Hermes thread" || thread.title === "Untitled thread"
        ? content.split(/\s+/).slice(0, 5).join(" ").replace(/[.?!,:;]+$/, "") || thread.title
        : thread.title;

    await ctx.db.patch(args.threadId, {
      title,
      updatedAt: now + 1,
      lastMessageAt: now + 1,
    });

    return { inserted: 2, userMessageId, assistantMessageId };
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingThreads = await ctx.db.query("hermesThreads").take(1);
    if (existingThreads.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const threadId = await ctx.db.insert("hermesThreads", {
      title: "Hermes launch thread",
      summary: "Starter conversation for Mission Control's dedicated Hermes workspace.",
      pinned: true,
      lastMessageAt: now - 1000,
      createdAt: now - 1000 * 30,
      updatedAt: now - 1000,
    });

    const messages = [
      {
        role: "system" as const,
        author: "System",
        content:
          "Hermes is online. This thread is seeded so the chat surface has a live history from the first render.",
        createdAt: now - 1000 * 24,
      },
      {
        role: "assistant" as const,
        author: "Hermes",
        content:
          "Mission Control is ready. I’m keeping the thread lean, the history live, and the interface close to the work.",
        createdAt: now - 1000 * 18,
      },
      {
        role: "user" as const,
        author: "You",
        content: "What should I watch first when this screen comes up?",
        createdAt: now - 1000 * 12,
      },
      {
        role: "assistant" as const,
        author: "Hermes",
        content:
          "Watch the thread list, the realtime badge, and the composer. If those stay in sync, the rest of the surface is doing its job.",
        createdAt: now - 1000 * 6,
      },
    ];

    for (const message of messages) {
      await ctx.db.insert("hermesMessages", {
        threadId,
        ...message,
      });
    }

    return { inserted: 1, threadId };
  },
});
