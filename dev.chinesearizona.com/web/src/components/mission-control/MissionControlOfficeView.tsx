"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertCircle,
  Bot,
  Clock3,
  Coffee,
  Loader,
  PenSquare,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useQuery } from "convex/react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type TeamMemberDoc = Doc<"teamMembers">;
type OfficePresenceDoc = Doc<"officePresence">;
type OfficeStatus = "working" | "writing" | "designing" | "reviewing" | "monitoring" | "idle";
type OfficeArea =
  | "north_station"
  | "west_station"
  | "south_station"
  | "east_station"
  | "northeast_station"
  | "lounge";
type TeamColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

const EMPTY_TEAM: TeamMemberDoc[] = [];
const EMPTY_PRESENCE: OfficePresenceDoc[] = [];

const COLOR_META: Record<
  TeamColor,
  {
    badgeClassName: string;
    glowClassName: string;
    nameClassName: string;
    deskGlowClassName: string;
  }
> = {
  indigo: {
    badgeClassName: "bg-indigo-400/12 text-indigo-200 ring-1 ring-indigo-400/18",
    glowClassName: "shadow-[0_0_0_4px_rgba(99,102,241,0.08)]",
    nameClassName: "text-indigo-200",
    deskGlowClassName: "shadow-[0_0_24px_rgba(99,102,241,0.24)]",
  },
  amber: {
    badgeClassName: "bg-amber-400/12 text-amber-200 ring-1 ring-amber-400/18",
    glowClassName: "shadow-[0_0_0_4px_rgba(251,191,36,0.08)]",
    nameClassName: "text-amber-200",
    deskGlowClassName: "shadow-[0_0_24px_rgba(251,191,36,0.22)]",
  },
  emerald: {
    badgeClassName: "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/18",
    glowClassName: "shadow-[0_0_0_4px_rgba(52,211,153,0.08)]",
    nameClassName: "text-emerald-200",
    deskGlowClassName: "shadow-[0_0_24px_rgba(52,211,153,0.22)]",
  },
  rose: {
    badgeClassName: "bg-rose-400/12 text-rose-200 ring-1 ring-rose-400/18",
    glowClassName: "shadow-[0_0_0_4px_rgba(251,113,133,0.08)]",
    nameClassName: "text-rose-200",
    deskGlowClassName: "shadow-[0_0_24px_rgba(251,113,133,0.22)]",
  },
  cyan: {
    badgeClassName: "bg-cyan-400/12 text-cyan-200 ring-1 ring-cyan-400/18",
    glowClassName: "shadow-[0_0_0_4px_rgba(34,211,238,0.08)]",
    nameClassName: "text-cyan-200",
    deskGlowClassName: "shadow-[0_0_24px_rgba(34,211,238,0.22)]",
  },
  violet: {
    badgeClassName: "bg-violet-400/12 text-violet-200 ring-1 ring-violet-400/18",
    glowClassName: "shadow-[0_0_0_4px_rgba(167,139,250,0.08)]",
    nameClassName: "text-violet-200",
    deskGlowClassName: "shadow-[0_0_24px_rgba(167,139,250,0.22)]",
  },
};

const STATUS_META: Record<
  OfficeStatus,
  {
    label: string;
    badgeClassName: string;
    icon: typeof Activity;
  }
> = {
  working: {
    label: "Working",
    badgeClassName: "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/18",
    icon: Activity,
  },
  writing: {
    label: "Writing",
    badgeClassName: "bg-violet-400/12 text-violet-200 ring-1 ring-violet-400/18",
    icon: PenSquare,
  },
  designing: {
    label: "Designing",
    badgeClassName: "bg-rose-400/12 text-rose-200 ring-1 ring-rose-400/18",
    icon: WandSparkles,
  },
  reviewing: {
    label: "Reviewing",
    badgeClassName: "bg-cyan-400/12 text-cyan-200 ring-1 ring-cyan-400/18",
    icon: Sparkles,
  },
  monitoring: {
    label: "Monitoring",
    badgeClassName: "bg-amber-400/12 text-amber-200 ring-1 ring-amber-400/18",
    icon: AlertCircle,
  },
  idle: {
    label: "Idle",
    badgeClassName: "bg-white/[0.08] text-zinc-300 ring-1 ring-white/10",
    icon: Coffee,
  },
};

const AREA_LABELS: Record<OfficeArea, string> = {
  north_station: "North station",
  west_station: "West station",
  south_station: "South station",
  east_station: "East station",
  northeast_station: "Northeast station",
  lounge: "Lounge",
};

const SCENE_LAYOUT: Record<
  OfficeArea,
  {
    deskClassName: string;
    avatarClassName: string;
    nameClassName: string;
    bubbleClassName?: string;
  }
> = {
  north_station: {
    deskClassName: "left-[50%] top-[14%] -translate-x-1/2",
    avatarClassName: "left-[50%] top-[22.5%] -translate-x-1/2",
    nameClassName: "left-[50%] top-[32%] -translate-x-1/2",
    bubbleClassName: "left-[50%] top-[9%] -translate-x-1/2",
  },
  west_station: {
    deskClassName: "left-[17%] top-[34%] -translate-x-1/2",
    avatarClassName: "left-[17%] top-[42.5%] -translate-x-1/2",
    nameClassName: "left-[17%] top-[52%] -translate-x-1/2",
    bubbleClassName: "left-[17%] top-[29%] -translate-x-1/2",
  },
  south_station: {
    deskClassName: "left-[50%] top-[56%] -translate-x-1/2",
    avatarClassName: "left-[50%] top-[64.5%] -translate-x-1/2",
    nameClassName: "left-[50%] top-[74%] -translate-x-1/2",
    bubbleClassName: "left-[50%] top-[51%] -translate-x-1/2",
  },
  east_station: {
    deskClassName: "left-[76%] top-[49%] -translate-x-1/2",
    avatarClassName: "left-[76%] top-[57.5%] -translate-x-1/2",
    nameClassName: "left-[76%] top-[67%] -translate-x-1/2",
    bubbleClassName: "left-[76%] top-[44%] -translate-x-1/2",
  },
  northeast_station: {
    deskClassName: "left-[79%] top-[20%] -translate-x-1/2",
    avatarClassName: "left-[79%] top-[28.5%] -translate-x-1/2",
    nameClassName: "left-[79%] top-[38%] -translate-x-1/2",
    bubbleClassName: "left-[79%] top-[15%] -translate-x-1/2",
  },
  lounge: {
    deskClassName: "left-[31%] top-[73%] -translate-x-1/2",
    avatarClassName: "left-[31%] top-[80%] -translate-x-1/2",
    nameClassName: "left-[31%] top-[89%] -translate-x-1/2",
  },
};

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  return relativeTimeFormat.format(Math.round(diff / hour), "hour");
}

function isDeskStatus(status: OfficeStatus) {
  return status !== "idle";
}

function Desk({
  area,
  member,
  presence,
}: {
  area: OfficeArea;
  member?: TeamMemberDoc;
  presence?: OfficePresenceDoc;
}) {
  const layout = SCENE_LAYOUT[area];
  const colorMeta = member ? COLOR_META[member.color] : null;
  const activeAtDesk = presence ? presence.isAtDesk && isDeskStatus(presence.status) : false;

  return (
    <>
      <div className={`absolute ${layout.deskClassName}`}>
        <div className="relative w-[92px] sm:w-[108px]">
          <div
            className={`mx-auto h-[22px] w-[72px] rounded-[10px] border border-white/10 bg-[#8c857d] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] sm:h-[24px] sm:w-[84px] ${
              colorMeta ? colorMeta.deskGlowClassName : ""
            }`}
          />
          <div className="relative mx-auto -mt-[34px] flex h-[30px] w-[34px] items-end justify-center sm:-mt-[38px] sm:h-[34px] sm:w-[38px]">
            <div className="absolute inset-x-0 bottom-0 mx-auto h-[6px] w-[18px] rounded-full bg-[#4a5568]" />
            <div className="absolute bottom-[5px] h-[12px] w-[3px] rounded-full bg-[#718096]" />
            <div className="absolute bottom-[15px] h-[15px] w-[26px] rounded-[4px] border border-white/12 bg-[linear-gradient(180deg,#60a5fa,#2563eb)] shadow-[0_0_12px_rgba(96,165,250,0.38)]" />
          </div>
          <div className="mx-auto mt-1 h-[24px] w-[6px] rounded-full bg-[#6d675f]" />
          <div className="mx-auto -mt-1 flex w-[72px] justify-between sm:w-[84px]">
            <span className="h-[18px] w-[6px] rounded-full bg-[#6d675f]" />
            <span className="h-[18px] w-[6px] rounded-full bg-[#6d675f]" />
          </div>
        </div>
      </div>

      {activeAtDesk && member && presence ? (
        <>
          <div className={`absolute ${layout.avatarClassName}`}>
            <div className="relative flex flex-col items-center">
              <div className={`h-[14px] w-[14px] rounded-full border border-white/10 bg-[#f4c9a2] ${colorMeta?.glowClassName ?? ""}`} />
              <div
                className="mt-[2px] h-[22px] w-[20px] rounded-[7px]"
                style={{
                  background:
                    member.color === "amber"
                      ? "linear-gradient(180deg,#f59e0b,#d97706)"
                      : member.color === "emerald"
                        ? "linear-gradient(180deg,#34d399,#059669)"
                        : member.color === "cyan"
                          ? "linear-gradient(180deg,#22d3ee,#0891b2)"
                          : member.color === "violet"
                            ? "linear-gradient(180deg,#a78bfa,#7c3aed)"
                            : member.color === "rose"
                              ? "linear-gradient(180deg,#fb7185,#e11d48)"
                              : "linear-gradient(180deg,#818cf8,#4f46e5)",
                }}
              />
              <div className="mt-[1px] flex gap-[6px]">
                <span className="h-[12px] w-[4px] rounded-full bg-[#f4c9a2]" />
                <span className="h-[12px] w-[4px] rounded-full bg-[#f4c9a2]" />
              </div>
            </div>
          </div>

          <div className={`absolute ${layout.nameClassName}`}>
            <div className="rounded-full border border-white/10 bg-[#09090b]/90 px-2 py-1 text-[10px] font-medium shadow-[0_8px_28px_rgba(0,0,0,0.42)]">
              <span className={colorMeta?.nameClassName}>{member.name}</span>
            </div>
          </div>

          {layout.bubbleClassName ? (
            <div className={`absolute hidden xl:block ${layout.bubbleClassName}`}>
              <div className="max-w-[180px] rounded-2xl border border-white/10 bg-[#09090b]/95 px-3 py-2 text-[10px] leading-5 text-zinc-300 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
                <div className="truncate font-medium text-white">{presence.currentTask}</div>
                <div className="truncate text-zinc-500">{presence.activeTool}</div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function MissionControlOfficeView({
  initialTeamMembers,
  initialOfficePresence,
}: {
  initialTeamMembers: TeamMemberDoc[];
  initialOfficePresence: OfficePresenceDoc[];
}) {
  const teamMembersQuery = useQuery(api.teamMembers.list);
  const officePresenceQuery = useQuery(api.officePresence.list);
  const teamMembers = teamMembersQuery ?? initialTeamMembers ?? EMPTY_TEAM;
  const officePresence = officePresenceQuery ?? initialOfficePresence ?? EMPTY_PRESENCE;
  const isLoading =
    teamMembersQuery === undefined &&
    officePresenceQuery === undefined &&
    initialTeamMembers.length === 0 &&
    initialOfficePresence.length === 0;

  const officeRoster = useMemo(() => {
    const presenceByName = new Map(officePresence.map((entry) => [entry.memberName, entry]));

    return teamMembers
      .map((member) => ({
        member,
        presence: presenceByName.get(member.name) ?? null,
      }))
      .sort((left, right) => left.member.sortOrder - right.member.sortOrder);
  }, [officePresence, teamMembers]);

  const statusCounts = useMemo(() => {
    return officePresence.reduce<Record<OfficeStatus, number>>(
      (counts, entry) => {
        counts[entry.status] += 1;
        return counts;
      },
      {
        working: 0,
        writing: 0,
        designing: 0,
        reviewing: 0,
        monitoring: 0,
        idle: 0,
      },
    );
  }, [officePresence]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[0.72rem] uppercase tracking-[0.3em] text-zinc-500">Mission Control Office</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-[2.45rem]">
            A live floor for the whole agent crew.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Each agent has a workstation, a current focus, and a live status. Active agents stay at
            their computers so you can scan the office and see who is doing what in seconds.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              "working",
              "writing",
              "designing",
              "reviewing",
              "monitoring",
              "idle",
            ] as OfficeStatus[]
          ).map((status) => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const count = statusCounts[status];

            return (
              <div
                key={status}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em] ${meta.badgeClassName}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
                <span className="text-white/85">{count}</span>
              </div>
            );
          })}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-[34px] border border-white/8 bg-[#0d0d11] shadow-[0_24px_120px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/8 bg-[linear-gradient(90deg,rgba(88,28,135,0.22),rgba(30,64,175,0.12),rgba(6,78,59,0.08))] px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-white">The Office</p>
                <p className="mt-1 text-sm text-zinc-400">A live map of who is at their station right now.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                  {officeRoster.length} desks occupied
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                  1 lounge table
                </span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[580px] items-center justify-center gap-3 text-sm text-zinc-400">
              <Loader className="h-4 w-4 animate-spin" />
              Loading office presence...
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#262626_0%,#1b1b1e_13%,#171719_13%,#171719_100%)]">
                <div className="absolute inset-x-0 top-0 h-[16%] border-b border-white/6 bg-[linear-gradient(180deg,rgba(148,163,184,0.14),rgba(71,85,105,0.06))]" />
                <div className="absolute left-[4%] right-[4%] top-[3%] grid h-[8%] grid-cols-9 gap-2">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <div key={index} className="rounded-md border border-white/6 bg-slate-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
                  ))}
                </div>

                <div className="absolute inset-x-0 bottom-0 top-[16%] bg-[linear-gradient(45deg,rgba(255,255,255,0.04)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.04)_50%,rgba(255,255,255,0.04)_75%,transparent_75%,transparent),linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0.02)_75%,transparent_75%,transparent)] bg-[size:76px_76px] bg-[position:0_0,38px_38px]" />

                <div className="absolute left-[38%] top-[68%] h-[74px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-[#6b6259] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-[88px] sm:w-[148px]">
                  <span className="absolute left-1/2 top-1/2 h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#81766c]" />
                  <span className="absolute left-[12%] top-[64%] h-[18px] w-[18px] rounded-full bg-[#4b5563]" />
                  <span className="absolute right-[12%] top-[64%] h-[18px] w-[18px] rounded-full bg-[#4b5563]" />
                </div>

                <div className="absolute bottom-[6%] left-[4%] h-[58px] w-[18px] rounded-t-full bg-[#22c55e]" />
                <div className="absolute bottom-[4%] left-[3.2%] h-[28px] w-[30px] rounded-md border border-white/8 bg-[#7c5133]" />
                <div className="absolute bottom-[6%] right-[4%] h-[58px] w-[18px] rounded-t-full bg-[#22c55e]" />
                <div className="absolute bottom-[4%] right-[3.2%] h-[28px] w-[30px] rounded-md border border-white/8 bg-[#7c5133]" />

                {(
                  [
                    "north_station",
                    "west_station",
                    "south_station",
                    "east_station",
                    "northeast_station",
                  ] as OfficeArea[]
                ).map((area) => {
                  const record = officeRoster.find((entry) => entry.presence?.area === area) ?? null;

                  return (
                    <Desk
                      key={area}
                      area={area}
                      member={record?.member}
                      presence={record?.presence ?? undefined}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-zinc-500">Status Board</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Quick team scan</h2>
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                Live
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {officeRoster.map(({ member, presence }) => {
                const colorMeta = COLOR_META[member.color];
                const status = presence?.status ?? "idle";
                const statusMeta = STATUS_META[status];
                const Icon = statusMeta.icon;

                return (
                  <article
                    key={member._id}
                    className="rounded-[22px] border border-white/8 bg-[#0f1014] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-sm font-semibold text-white">
                          {member.avatarLabel}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{member.name}</p>
                          <p className="text-xs text-zinc-500">{member.roleTitle}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.18em] ${statusMeta.badgeClassName}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                      <Icon className="h-3.5 w-3.5" />
                      {presence?.isAtDesk ? "At workstation" : "Away from desk"}
                      <span className="text-zinc-600">•</span>
                      {presence ? AREA_LABELS[presence.area] : "No station"}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-zinc-300">
                      {presence?.currentTask ?? "No active task"}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={`rounded-full px-2.5 py-1 ${colorMeta.badgeClassName}`}>
                        {presence?.activeTool ?? "Standby"}
                      </span>
                      <span className="text-zinc-500">
                        {presence ? formatRelativeTime(presence.lastUpdatedAt) : "not updated"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
                <Bot className="h-5 w-5 text-zinc-200" />
              </div>
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-zinc-500">Office Logic</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Presence rules</h2>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-400">
              <p>Agents with active statuses stay at their computers inside the office map.</p>
              <p>Each member has a dedicated station so you can build a quick spatial memory of the team.</p>
              <p>Status cards mirror the scene, making it easy to scan both location and current focus.</p>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-zinc-200">
                <Clock3 className="h-4 w-4 text-zinc-500" />
                Current office pulse
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Codex is actively shipping the office view while the rest of the crew is assigned to
                supporting implementation, design polish, monitoring, and writing tasks.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
