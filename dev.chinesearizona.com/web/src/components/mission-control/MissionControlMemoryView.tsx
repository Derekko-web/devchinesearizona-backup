"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Clock3, FileText, Loader, Search, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type MemoryDoc = Doc<"memories">;
type MemoryKind = "long_term" | "journal" | "decision" | "reference";
type MemoryColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

const EMPTY_MEMORIES: MemoryDoc[] = [];

const KIND_META: Record<
  MemoryKind,
  {
    label: string;
    eyebrow: string;
  }
> = {
  long_term: {
    label: "Long-Term Memory",
    eyebrow: "Pinned context",
  },
  journal: {
    label: "Daily Journal",
    eyebrow: "Recent notes",
  },
  decision: {
    label: "Decisions",
    eyebrow: "Product direction",
  },
  reference: {
    label: "References",
    eyebrow: "Operational context",
  },
};

const COLOR_META: Record<
  MemoryColor,
  {
    dotClassName: string;
    badgeClassName: string;
    surfaceClassName: string;
    textClassName: string;
  }
> = {
  indigo: {
    dotClassName: "bg-indigo-300",
    badgeClassName: "bg-indigo-400/12 text-indigo-200 ring-1 ring-indigo-400/18",
    surfaceClassName: "border-indigo-400/18 bg-indigo-400/[0.07]",
    textClassName: "text-indigo-200",
  },
  amber: {
    dotClassName: "bg-amber-300",
    badgeClassName: "bg-amber-400/12 text-amber-200 ring-1 ring-amber-400/18",
    surfaceClassName: "border-amber-400/18 bg-amber-400/[0.07]",
    textClassName: "text-amber-200",
  },
  emerald: {
    dotClassName: "bg-emerald-300",
    badgeClassName: "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/18",
    surfaceClassName: "border-emerald-400/18 bg-emerald-400/[0.07]",
    textClassName: "text-emerald-200",
  },
  rose: {
    dotClassName: "bg-rose-300",
    badgeClassName: "bg-rose-400/12 text-rose-200 ring-1 ring-rose-400/18",
    surfaceClassName: "border-rose-400/18 bg-rose-400/[0.07]",
    textClassName: "text-rose-200",
  },
  cyan: {
    dotClassName: "bg-cyan-300",
    badgeClassName: "bg-cyan-400/12 text-cyan-200 ring-1 ring-cyan-400/18",
    surfaceClassName: "border-cyan-400/18 bg-cyan-400/[0.07]",
    textClassName: "text-cyan-200",
  },
  violet: {
    dotClassName: "bg-violet-300",
    badgeClassName: "bg-violet-400/12 text-violet-200 ring-1 ring-violet-400/18",
    surfaceClassName: "border-violet-400/18 bg-violet-400/[0.07]",
    textClassName: "text-violet-200",
  },
};

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const absoluteDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  if (Math.abs(diff) < day) {
    return relativeTimeFormat.format(Math.round(diff / hour), "hour");
  }
  if (Math.abs(diff) < week) {
    return relativeTimeFormat.format(Math.round(diff / day), "day");
  }
  return relativeTimeFormat.format(Math.round(diff / week), "week");
}

function formatDocumentDate(memory: MemoryDoc) {
  return absoluteDateFormatter.format(memory.documentDate ?? memory.updatedAt);
}

function getPreview(memory: MemoryDoc) {
  if (memory.summary) {
    return memory.summary;
  }

  const firstLine = memory.content
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim())
    .find(Boolean);

  return firstLine ?? "No preview available.";
}

function matchesSearch(memory: MemoryDoc, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [memory.title, memory.summary, memory.content, memory.sourcePath, ...memory.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function renderListBlock(lines: string[], ordered: boolean, key: string) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <ListTag
      key={key}
      className={`space-y-3 pl-6 text-[0.98rem] leading-7 text-zinc-300 ${ordered ? "list-decimal" : "list-disc"}`}
    >
      {lines.map((line, index) => (
        <li key={`${key}-${index}`}>
          {line.replace(ordered ? /^\d+\.\s*/ : /^-\s*/, "")}
        </li>
      ))}
    </ListTag>
  );
}

function renderDocumentContent(content: string) {
  return content
    .trim()
    .split(/\n\s*\n/)
    .map((block, index) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      if (/^#{1,6}\s/.test(lines[0])) {
        const heading = lines[0].replace(/^#{1,6}\s*/, "");
        const rest = lines.slice(1);

        return (
          <section key={`section-${index}`} className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white">{heading}</h2>
            {rest.length === 0 ? null : rest.every((line) => /^-\s/.test(line)) ? (
              renderListBlock(rest, false, `section-list-${index}`)
            ) : rest.every((line) => /^\d+\.\s/.test(line)) ? (
              renderListBlock(rest, true, `section-list-${index}`)
            ) : (
              <p className="text-[1.02rem] leading-8 text-zinc-300">{rest.join(" ")}</p>
            )}
          </section>
        );
      }

      if (lines.every((line) => /^-\s/.test(line))) {
        return renderListBlock(lines, false, `list-${index}`);
      }

      if (lines.every((line) => /^\d+\.\s/.test(line))) {
        return renderListBlock(lines, true, `ordered-list-${index}`);
      }

      return (
        <p key={`paragraph-${index}`} className="text-[1.02rem] leading-8 text-zinc-300">
          {lines.join(" ")}
        </p>
      );
    });
}

export function MissionControlMemoryView({ initialMemories }: { initialMemories: MemoryDoc[] }) {
  const memoriesQuery = useQuery(api.memories.list);

  const [searchText, setSearchText] = useState("");
  const [selectedMemoryId, setSelectedMemoryId] = useState<Id<"memories"> | null>(null);

  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());
  const memories = memoriesQuery ?? initialMemories ?? EMPTY_MEMORIES;
  const isLoading = memoriesQuery === undefined && initialMemories.length === 0;

  const filteredMemories = useMemo(
    () => memories.filter((memory) => matchesSearch(memory, deferredSearch)),
    [deferredSearch, memories],
  );

  useEffect(() => {
    if (filteredMemories.length === 0) {
      return;
    }

    const hasSelection = selectedMemoryId
      ? filteredMemories.some((memory) => memory._id === selectedMemoryId)
      : false;

    if (!hasSelection) {
      startTransition(() => {
        setSelectedMemoryId(filteredMemories[0]._id);
      });
    }
  }, [filteredMemories, selectedMemoryId]);

  const selectedMemory =
    filteredMemories.find((memory) => memory._id === selectedMemoryId) ??
    filteredMemories[0] ??
    null;

  const pinnedCount = memories.filter((memory) => memory.pinned).length;
  const journalCount = memories.filter((memory) => memory.kind === "journal").length;

  const sections = deferredSearch
    ? [
        {
          key: "results",
          label: `Results${filteredMemories.length ? ` (${filteredMemories.length})` : ""}`,
          eyebrow: "Search matches",
          items: filteredMemories,
        },
      ]
    : ([
        {
          key: "long_term",
          label: KIND_META.long_term.label,
          eyebrow: KIND_META.long_term.eyebrow,
          items: filteredMemories.filter((memory) => memory.kind === "long_term" || memory.pinned),
        },
        {
          key: "journal",
          label: KIND_META.journal.label,
          eyebrow: KIND_META.journal.eyebrow,
          items: filteredMemories.filter((memory) => memory.kind === "journal"),
        },
        {
          key: "decision",
          label: KIND_META.decision.label,
          eyebrow: KIND_META.decision.eyebrow,
          items: filteredMemories.filter((memory) => memory.kind === "decision"),
        },
        {
          key: "reference",
          label: KIND_META.reference.label,
          eyebrow: KIND_META.reference.eyebrow,
          items: filteredMemories.filter(
            (memory) => memory.kind === "reference" && !memory.pinned,
          ),
        },
      ] as const).filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.72rem] uppercase tracking-[0.3em] text-zinc-500">Mission Memory</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-[2.4rem]">
              Durable context, searchable in seconds.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              Store long-term notes, operator journals, and key decisions in readable documents so
              they are easier to revisit than scattered chat fragments.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-zinc-500">Documents</p>
              <p className="mt-2 text-2xl font-semibold text-white">{memories.length}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-zinc-500">Pinned</p>
              <p className="mt-2 text-2xl font-semibold text-white">{pinnedCount}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4 sm:col-span-1 col-span-2">
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-zinc-500">Journals</p>
              <p className="mt-2 text-2xl font-semibold text-white">{journalCount}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search memory, tags, or document text..."
                className="h-12 w-full rounded-2xl border border-white/8 bg-[#111115] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-400/35"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-white/8 bg-[#0d0d12] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
                  <Sparkles className="h-4 w-4 text-indigo-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Search Component</p>
                  <p className="text-xs text-zinc-500">Matches titles, tags, summaries, and body text.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/8 bg-white/[0.02] p-3">
            {isLoading ? (
              <div className="flex items-center gap-3 px-3 py-4 text-sm text-zinc-400">
                <Loader className="h-4 w-4 animate-spin" />
                Loading memories...
              </div>
            ) : sections.length === 0 ? (
              <div className="px-3 py-6 text-sm text-zinc-500">No memories matched that search.</div>
            ) : (
              <div className="space-y-5">
                {sections.map((section) => (
                  <section key={section.key}>
                    <div className="flex items-center justify-between px-3 pb-3">
                      <div>
                        <p className="text-[0.7rem] uppercase tracking-[0.24em] text-zinc-500">
                          {section.eyebrow}
                        </p>
                        <h2 className="mt-1 text-sm font-medium text-zinc-200">{section.label}</h2>
                      </div>
                      <span className="rounded-full border border-white/8 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500">
                        {section.items.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {section.items.map((memory) => {
                        const isActive = selectedMemory?._id === memory._id;
                        const colorMeta = COLOR_META[memory.color];

                        return (
                          <button
                            key={memory._id}
                            type="button"
                            onClick={() => setSelectedMemoryId(memory._id)}
                            className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                              isActive
                                ? `${colorMeta.surfaceClassName} text-white`
                                : "border-white/6 bg-[#0d0d11] text-zinc-300 hover:border-white/12 hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${colorMeta.dotClassName}`} />
                                  <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                                    {KIND_META[memory.kind].label}
                                  </span>
                                </div>
                                <p className="mt-3 truncate text-sm font-medium text-white">{memory.title}</p>
                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                                  {getPreview(memory)}
                                </p>
                              </div>
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-500">
                              <span>{memory.wordCount} words</span>
                              <span>{formatRelativeTime(memory.updatedAt)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {selectedMemory ? (
            <article className="overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_24px_120px_rgba(0,0,0,0.35)]">
              <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_28%),#111115] px-6 py-6 lg:px-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] ${COLOR_META[selectedMemory.color].badgeClassName}`}>
                    {KIND_META[selectedMemory.kind].label}
                  </span>
                  {selectedMemory.pinned ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-zinc-300">
                      Pinned
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white lg:text-[2rem]">
                  {selectedMemory.title}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                  <span>{formatDocumentDate(selectedMemory)}</span>
                  <span>{selectedMemory.wordCount} words</span>
                  <span>Modified {formatRelativeTime(selectedMemory.updatedAt)}</span>
                </div>

                {selectedMemory.summary ? (
                  <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-zinc-300">
                    {selectedMemory.summary}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedMemory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:px-8 lg:py-8">
                <div className="space-y-6">{renderDocumentContent(selectedMemory.content)}</div>

                <aside className="space-y-4">
                  <div className="rounded-[26px] border border-white/8 bg-[#0d0d11] p-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-zinc-500">Document Meta</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-zinc-500">Type</span>
                        <span className={`text-right ${COLOR_META[selectedMemory.color].textClassName}`}>
                          {KIND_META[selectedMemory.kind].label}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-zinc-500">Updated</span>
                        <span className="text-right text-zinc-300">{formatRelativeTime(selectedMemory.updatedAt)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-zinc-500">Words</span>
                        <span className="text-right text-zinc-300">{selectedMemory.wordCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/8 bg-[#0d0d11] p-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-zinc-500">Source</p>
                    <p className="mt-3 break-all text-sm leading-6 text-zinc-300">
                      {selectedMemory.sourcePath ?? "Mission Control memory store"}
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-white/8 bg-[#0d0d11] p-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-200">
                      <Clock3 className="h-4 w-4 text-zinc-500" />
                      Quick use
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      Search narrows the memory list instantly while the selected document stays in a
                      reader-style layout for longer notes and decisions.
                    </p>
                  </div>
                </aside>
              </div>
            </article>
          ) : (
            <div className="flex min-h-[540px] items-center justify-center rounded-[34px] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
              <div className="max-w-md">
                <FileText className="mx-auto h-10 w-10 text-zinc-500" />
                <h2 className="mt-4 text-xl font-semibold text-white">No memory selected</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Search for a document or choose one from the list to open the reader.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
