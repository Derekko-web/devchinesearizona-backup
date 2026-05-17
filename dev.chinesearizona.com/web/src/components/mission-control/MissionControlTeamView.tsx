"use client";

import { useMemo } from "react";
import {
  Bot,
  Brush,
  Code2,
  Loader,
  Orbit,
  PenSquare,
  Sparkles,
} from "lucide-react";
import { useQuery } from "convex/react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type TeamMemberDoc = Doc<"teamMembers">;
type TeamDiscipline = "developer" | "writer" | "designer";
type TeamColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

const EMPTY_TEAM: TeamMemberDoc[] = [];

const DISCIPLINE_META: Record<
  TeamDiscipline,
  {
    label: string;
    summary: string;
    icon: typeof Code2;
    accentClassName: string;
    surfaceClassName: string;
  }
> = {
  developer: {
    label: "Developers",
    summary: "Implementation, debugging, architecture scouting, and safe delivery.",
    icon: Code2,
    accentClassName: "text-cyan-200",
    surfaceClassName: "border-cyan-400/16 bg-cyan-400/[0.05]",
  },
  writer: {
    label: "Writers",
    summary: "Docs, summaries, UI copy, and clearer communication around the work.",
    icon: PenSquare,
    accentClassName: "text-violet-200",
    surfaceClassName: "border-violet-400/16 bg-violet-400/[0.05]",
  },
  designer: {
    label: "Designers",
    summary: "Visual direction, product polish, interaction quality, and interface clarity.",
    icon: Brush,
    accentClassName: "text-rose-200",
    surfaceClassName: "border-rose-400/16 bg-rose-400/[0.05]",
  },
};

const COLOR_META: Record<
  TeamColor,
  {
    glowClassName: string;
    badgeClassName: string;
    dotClassName: string;
  }
> = {
  indigo: {
    glowClassName: "from-indigo-500/14 via-indigo-400/6 to-transparent",
    badgeClassName: "bg-indigo-400/12 text-indigo-200 ring-1 ring-indigo-400/18",
    dotClassName: "bg-indigo-300",
  },
  amber: {
    glowClassName: "from-amber-500/14 via-amber-400/6 to-transparent",
    badgeClassName: "bg-amber-400/12 text-amber-200 ring-1 ring-amber-400/18",
    dotClassName: "bg-amber-300",
  },
  emerald: {
    glowClassName: "from-emerald-500/14 via-emerald-400/6 to-transparent",
    badgeClassName: "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/18",
    dotClassName: "bg-emerald-300",
  },
  rose: {
    glowClassName: "from-rose-500/14 via-rose-400/6 to-transparent",
    badgeClassName: "bg-rose-400/12 text-rose-200 ring-1 ring-rose-400/18",
    dotClassName: "bg-rose-300",
  },
  cyan: {
    glowClassName: "from-cyan-500/14 via-cyan-400/6 to-transparent",
    badgeClassName: "bg-cyan-400/12 text-cyan-200 ring-1 ring-cyan-400/18",
    dotClassName: "bg-cyan-300",
  },
  violet: {
    glowClassName: "from-violet-500/14 via-violet-400/6 to-transparent",
    badgeClassName: "bg-violet-400/12 text-violet-200 ring-1 ring-violet-400/18",
    dotClassName: "bg-violet-300",
  },
};

const STATE_LABELS = {
  observed: "Observed",
  formalized: "Formalized",
} as const;

const CADENCE_LABELS = {
  always_on: "Always on",
  regular: "Regular",
  on_demand: "On demand",
} as const;

function formatObservedDate(timestamp: number | undefined) {
  if (!timestamp) {
    return "Not yet observed";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}

function TeamMemberCard({
  member,
  compact = false,
}: {
  member: TeamMemberDoc;
  compact?: boolean;
}) {
  const colorMeta = COLOR_META[member.color];

  return (
    <article
      className={`group relative overflow-hidden rounded-[26px] border border-white/8 bg-[#111115] transition duration-200 hover:-translate-y-0.5 hover:border-white/12 hover:bg-[#14141a] ${
        compact ? "min-h-[250px] px-4 py-4" : "px-5 py-5"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorMeta.glowClassName}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] text-sm font-semibold text-white">
              {member.avatarLabel}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-white">{member.name}</h3>
              <p className="text-sm text-zinc-400">{member.roleTitle}</p>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.18em] ${colorMeta.badgeClassName}`}>
            {member.memberType === "core_agent" ? "Core" : "Subagent"}
          </span>
        </div>

        <p className={`mt-4 text-sm leading-7 ${compact ? "text-zinc-300" : "text-zinc-300"}`}>
          {member.summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.18em] text-zinc-300">
            {STATE_LABELS[member.state]}
          </span>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.18em] text-zinc-300">
            {CADENCE_LABELS[member.cadence]}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Responsibilities</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
              {member.responsibilities.slice(0, compact ? 2 : 3).map((item) => (
                <li key={item} className="flex gap-2">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${colorMeta.dotClassName}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Takes From Codex</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {member.takesFromCodex.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-white/8 pt-4 text-xs text-zinc-500">
          <p>{member.sourceLabel}</p>
          <p className="mt-1">Last seen {formatObservedDate(member.lastObservedAt)}</p>
        </div>
      </div>
    </article>
  );
}

export function MissionControlTeamView({ initialTeamMembers }: { initialTeamMembers: TeamMemberDoc[] }) {
  const teamMembersQuery = useQuery(api.teamMembers.list);

  const teamMembers = teamMembersQuery ?? initialTeamMembers ?? EMPTY_TEAM;
  const isLoading = teamMembersQuery === undefined && initialTeamMembers.length === 0;

  const leadMember = useMemo(
    () => teamMembers.find((member) => member.memberType === "core_agent") ?? null,
    [teamMembers],
  );

  const disciplineSections = useMemo(
    () =>
      (["developer", "writer", "designer"] as TeamDiscipline[]).map((discipline) => ({
        discipline,
        members: teamMembers.filter(
          (member) => member.discipline === discipline && member.memberType === "subagent",
        ),
      })),
    [teamMembers],
  );

  const observedCount = teamMembers.filter((member) => member.state === "observed").length;
  const formalizedCount = teamMembers.filter((member) => member.state === "formalized").length;

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-[0.72rem] uppercase tracking-[0.32em] text-zinc-500">Mission Control Team</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-[3.2rem]">
          Meet the operating roster.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
          A live view of Codex plus the recurring subagent roles used to explore, write, design,
          and ship work. Observed roles were seen in-session. Formalized roles were defined on
          April 20, 2026 so the team structure stays explicit.
        </p>
      </header>

      <section className="mt-8 grid gap-3 md:grid-cols-4">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Agents</p>
          <p className="mt-2 text-2xl font-semibold text-white">{teamMembers.length}</p>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Disciplines</p>
          <p className="mt-2 text-2xl font-semibold text-white">3</p>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Observed</p>
          <p className="mt-2 text-2xl font-semibold text-white">{observedCount}</p>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Formalized</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formalizedCount}</p>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-12 flex items-center justify-center gap-3 rounded-[32px] border border-white/8 bg-white/[0.03] px-6 py-16 text-sm text-zinc-400">
          <Loader className="h-4 w-4 animate-spin" />
          Loading team structure...
        </div>
      ) : (
        <div className="mt-10">
          <div className="relative mx-auto flex max-w-4xl justify-center">
            <div className="absolute left-1/2 top-[calc(100%-1px)] hidden h-10 w-px -translate-x-1/2 bg-white/10 lg:block" />
            {leadMember ? (
              <div className="w-full max-w-[620px]">
                <TeamMemberCard member={leadMember} />
              </div>
            ) : null}
          </div>

          <div className="relative mt-10 hidden h-8 lg:block">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
            <div className="absolute left-[16.66%] right-[16.66%] top-4 h-px bg-white/10" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {disciplineSections.map(({ discipline, members }) => {
              const meta = DISCIPLINE_META[discipline];
              const Icon = meta.icon;

              return (
                <section
                  key={discipline}
                  className={`rounded-[30px] border px-4 py-4 ${meta.surfaceClassName}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05]">
                      <Icon className={`h-5 w-5 ${meta.accentClassName}`} />
                    </div>
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Discipline</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">{meta.label}</h2>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-zinc-400">{meta.summary}</p>

                  <div className="mt-5 space-y-4">
                    {members.length > 0 ? (
                      members.map((member) => <TeamMemberCard key={member._id} member={member} compact />)
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                        No recurring members in this discipline yet.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[30px] border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
                  <Orbit className="h-5 w-5 text-zinc-200" />
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Operating Model</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">How the roster works</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <Code2 className="h-5 w-5 text-cyan-200" />
                  <p className="mt-3 text-sm font-medium text-white">Developers</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Handle repo exploration, implementation, debugging, and safe validation.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <PenSquare className="h-5 w-5 text-violet-200" />
                  <p className="mt-3 text-sm font-medium text-white">Writers</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Clarify messaging, docs, summaries, and user-facing language around the work.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <Brush className="h-5 w-5 text-rose-200" />
                  <p className="mt-3 text-sm font-medium text-white">Designers</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Improve layout, hierarchy, interactions, and overall visual coherence.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
                  <Bot className="h-5 w-5 text-zinc-200" />
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Roster Note</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Observed vs formalized</h2>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-400">
                <p>
                  <span className="font-medium text-zinc-200">Observed</span> means the role was seen in
                  the current workspace or live subagent context.
                </p>
                <p>
                  <span className="font-medium text-zinc-200">Formalized</span> means the role was defined
                  as a recurring operating slot on April 20, 2026 so future delegation stays structured.
                </p>
                <p>
                  This keeps the screen honest while still giving Mission Control a clear team map for
                  the kinds of specialists Codex should reach for repeatedly.
                </p>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex items-center gap-2 text-sm text-zinc-200">
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  Recommended pattern
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Keep Codex as the lead builder, use McClintock for architecture scouting, Confucius
                  for implementation depth, Banach for writing polish, and Lorentz for design direction.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
