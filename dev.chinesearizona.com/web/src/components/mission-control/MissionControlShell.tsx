"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarDays,
  Command,
  MessageSquareText,
  ListTodo,
  Sparkles,
  Users2,
} from "lucide-react";

export type MissionControlTool = "tasks" | "calendar" | "hermes" | "memory" | "office" | "team";

type MissionControlShellProps = {
  tool: MissionControlTool;
  children: ReactNode;
};

const liveTools = [
  {
    href: "/mission-control",
    icon: ListTodo,
    label: "Tasks",
    detail: "Live",
    tool: "tasks" as MissionControlTool,
  },
  {
    href: "/mission-control/calendar",
    icon: CalendarDays,
    label: "Calendar",
    detail: "Live",
    tool: "calendar" as MissionControlTool,
  },
  {
    href: "/mission-control/hermes",
    icon: MessageSquareText,
    label: "Hermes",
    detail: "Live",
    tool: "hermes" as MissionControlTool,
  },
  {
    href: "/mission-control/memory",
    icon: BookOpen,
    label: "Memory",
    detail: "Live",
    tool: "memory" as MissionControlTool,
  },
  {
    href: "/mission-control/office",
    icon: Building2,
    label: "Office",
    detail: "Live",
    tool: "office" as MissionControlTool,
  },
  {
    href: "/mission-control/team",
    icon: Users2,
    label: "Team",
    detail: "Live",
    tool: "team" as MissionControlTool,
  },
];

const toolScopeLabels: Record<MissionControlTool, string> = {
  tasks: "Active work",
  calendar: "Scheduled ops",
  hermes: "Chat surface",
  memory: "Stored context",
  office: "Digital HQ",
  team: "Operating roster",
};

export function MissionControlShell({ tool, children }: MissionControlShellProps) {
  return (
    <div className="mission-control-shell min-h-screen bg-[#09090b] text-zinc-100">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="border-b border-white/6 bg-[#070709] px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
              <Command className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-zinc-500">Workspace</p>
              <h1 className="text-lg font-semibold text-white">Mission Control</h1>
            </div>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {liveTools.map(({ href, icon: Icon, label, tool: itemTool }) => {
              const active = tool === itemTool;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                    active
                      ? "border-white/12 bg-white/[0.06] text-white"
                      : "border-white/8 bg-white/[0.02] text-zinc-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 hidden lg:block">
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-zinc-500">Tools</p>
            <nav className="mt-4 space-y-1">
              {liveTools.map(({ href, icon: Icon, label, detail, tool: itemTool }) => {
                const active = tool === itemTool;

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "bg-white/[0.06] text-white"
                        : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </span>
                    <span className="text-[0.7rem] uppercase tracking-[0.22em] text-zinc-500">{detail}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.28em] text-zinc-500">System</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Database</span>
                <span className="flex items-center gap-2 text-zinc-200">
                  <Activity className="h-3.5 w-3.5 text-emerald-300" />
                  Convex local
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Realtime</span>
                <span className="flex items-center gap-2 text-zinc-200">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                  Live
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Scope</span>
                <span className="text-zinc-200">{toolScopeLabels[tool]}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_24%),#09090b] px-4 pb-8 pt-6 lg:px-10 lg:pb-10 lg:pt-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
