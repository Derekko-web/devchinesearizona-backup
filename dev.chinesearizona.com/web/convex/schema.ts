import { defineSchema, defineTable } from "convex/server";
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

const teamDiscipline = v.union(
  v.literal("developer"),
  v.literal("writer"),
  v.literal("designer"),
);

const teamMemberType = v.union(
  v.literal("core_agent"),
  v.literal("subagent"),
);

const teamMemberState = v.union(
  v.literal("observed"),
  v.literal("formalized"),
);

const teamCadence = v.union(
  v.literal("always_on"),
  v.literal("regular"),
  v.literal("on_demand"),
);

const teamColor = v.union(
  v.literal("indigo"),
  v.literal("amber"),
  v.literal("emerald"),
  v.literal("rose"),
  v.literal("cyan"),
  v.literal("violet"),
);

const officeStatus = v.union(
  v.literal("working"),
  v.literal("writing"),
  v.literal("designing"),
  v.literal("reviewing"),
  v.literal("monitoring"),
  v.literal("idle"),
);

const officeArea = v.union(
  v.literal("north_station"),
  v.literal("west_station"),
  v.literal("south_station"),
  v.literal("east_station"),
  v.literal("northeast_station"),
  v.literal("lounge"),
);

const hermesMessageRole = v.union(
  v.literal("system"),
  v.literal("user"),
  v.literal("assistant"),
);

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    assignee: taskAssignee,
    priority: taskPriority,
    project: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"]),
  scheduledItems: defineTable({
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
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_kind", ["kind"])
    .index("by_cadence", ["cadence"]),
  memories: defineTable({
    title: v.string(),
    summary: v.optional(v.string()),
    content: v.string(),
    kind: memoryKind,
    color: memoryColor,
    tags: v.array(v.string()),
    sourcePath: v.optional(v.string()),
    documentDate: v.optional(v.number()),
    wordCount: v.number(),
    pinned: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_kind", ["kind"]),
  teamMembers: defineTable({
    name: v.string(),
    roleTitle: v.string(),
    summary: v.optional(v.string()),
    tagline: v.optional(v.string()),
    discipline: teamDiscipline,
    memberType: teamMemberType,
    state: teamMemberState,
    cadence: teamCadence,
    color: teamColor,
    avatarLabel: v.string(),
    responsibilities: v.array(v.string()),
    takesFromCodex: v.array(v.string()),
    sourceLabel: v.optional(v.string()),
    lastObservedAt: v.optional(v.number()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sortOrder", ["sortOrder"])
    .index("by_discipline", ["discipline"])
    .index("by_updatedAt", ["updatedAt"]),
  officePresence: defineTable({
    memberName: v.string(),
    status: officeStatus,
    area: officeArea,
    currentTask: v.optional(v.string()),
    statusNote: v.optional(v.string()),
    activeTool: v.optional(v.string()),
    isAtDesk: v.boolean(),
    lastUpdatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_memberName", ["memberName"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_status", ["status"]),
  hermesThreads: defineTable({
    title: v.string(),
    summary: v.optional(v.string()),
    pinned: v.boolean(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lastMessageAt", ["lastMessageAt"])
    .index("by_updatedAt", ["updatedAt"]),
  hermesMessages: defineTable({
    threadId: v.id("hermesThreads"),
    role: hermesMessageRole,
    author: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_threadId_createdAt", ["threadId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
});
