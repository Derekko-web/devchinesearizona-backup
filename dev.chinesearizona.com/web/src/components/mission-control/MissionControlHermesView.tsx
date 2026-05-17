"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Bot,
  Clock3,
  Loader,
  MessageSquareText,
  Pin,
  SendHorizontal,
  Sparkles,
  User2,
} from "lucide-react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type HermesThreadDoc = Doc<"hermesThreads">;
type HermesMessageDoc = Doc<"hermesMessages">;

const EMPTY_THREADS: HermesThreadDoc[] = [];
const EMPTY_MESSAGES: HermesMessageDoc[] = [];

const PROMPTS = [
  "Give me a quick status check on Mission Control.",
  "What should I verify before shipping this screen?",
  "Turn this thread into a clean next-step summary.",
];

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  if (Math.abs(diff) < day) {
    return relativeTimeFormat.format(Math.round(diff / hour), "hour");
  }

  return relativeTimeFormat.format(Math.round(diff / day), "day");
}

function messageTone(message: HermesMessageDoc) {
  if (message.role === "user") {
    return {
      containerClassName: "ml-auto border border-indigo-400/20 bg-indigo-400/[0.08]",
      icon: User2,
      iconClassName: "text-indigo-200",
    };
  }

  if (message.role === "assistant") {
    return {
      containerClassName: "mr-auto border border-white/8 bg-white/[0.03]",
      icon: Bot,
      iconClassName: "text-emerald-200",
    };
  }

  return {
    containerClassName: "mx-auto border border-white/10 bg-white/[0.02]",
    icon: Sparkles,
    iconClassName: "text-zinc-300",
  };
}

export function MissionControlHermesView({
  initialThreads,
  initialMessages,
}: {
  initialThreads: HermesThreadDoc[];
  initialMessages: HermesMessageDoc[];
}) {
  const threadsQuery = useQuery(api.hermesThreads.listThreads);
  const connectionState = useConvexConnectionState();
  const sendMessage = useMutation(api.hermesThreads.sendMessage);

  const threads = threadsQuery ?? initialThreads ?? EMPTY_THREADS;
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"hermesThreads"> | null>(
    threads[0]?._id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeThreadId = selectedThreadId ?? threads[0]?._id ?? null;
  const seededThreadId = initialThreads[0]?._id ?? null;

  const messagesQuery = useQuery(
    api.hermesThreads.listMessages,
    activeThreadId ? { threadId: activeThreadId } : "skip",
  );

  const activeThread = useMemo(
    () => threads.find((thread) => thread._id === activeThreadId) ?? null,
    [activeThreadId, threads],
  );

  const messages =
    messagesQuery ??
    (activeThreadId !== null && activeThreadId === seededThreadId ? initialMessages : EMPTY_MESSAGES);

  const isLoading = threadsQuery === undefined && initialThreads.length === 0;
  const isRealtime = connectionState.hasEverConnected && connectionState.isWebSocketConnected;

  useEffect(() => {
    if (selectedThreadId || threads.length === 0) {
      return;
    }

    setSelectedThreadId(threads[0]._id);
  }, [selectedThreadId, threads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [activeThreadId, messages.length]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();
    if (!content || !activeThreadId) {
      return;
    }

    setIsSending(true);

    try {
      await sendMessage({
        threadId: activeThreadId,
        content,
      });

      startTransition(() => {
        setDraft("");
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[32px] border border-white/8 bg-white/[0.03] px-6 py-6 shadow-[0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.72rem] uppercase tracking-[0.32em] text-zinc-500">Hermes</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-[2.75rem]">
              A dedicated chat surface for Mission Control.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 lg:text-base">
              Thread history stays live in Convex, so the workspace feels like an operational log instead of a mock.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.24em] text-zinc-500">
            <span
              className={`rounded-full px-3 py-2 ${
                isLoading
                  ? "border border-indigo-400/20 bg-indigo-400/[0.08] text-indigo-200"
                  : isRealtime
                    ? "border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200"
                    : "border border-amber-400/20 bg-amber-400/[0.08] text-amber-200"
              }`}
            >
              {isLoading ? "Loading" : isRealtime ? "Realtime live" : "Snapshot mode"}
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
              {threads.length} thread{threads.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setDraft(prompt)}
              className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-left text-sm text-zinc-300 transition hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-zinc-500">Threads</p>
              <h3 className="mt-2 text-base font-semibold text-white">Conversation history</h3>
            </div>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-zinc-500">
              Live
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {threads.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
                No Hermes threads yet.
              </div>
            ) : (
              threads.map((thread) => {
                const active = thread._id === activeThreadId;

                return (
                  <button
                    key={thread._id}
                    type="button"
                    onClick={() => {
                      startTransition(() => {
                        setSelectedThreadId(thread._id);
                      });
                    }}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-white/15 bg-white/[0.07]"
                        : "border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-white">{thread.title}</p>
                      <div className="flex items-center gap-2 text-zinc-500">
                        {thread.pinned ? <Pin className="h-3.5 w-3.5 text-amber-300" /> : null}
                        <span className="text-[0.66rem] uppercase tracking-[0.22em]">
                          {formatRelativeTime(thread.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {thread.summary ?? "Thread history stored in Convex and ready for live updates."}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.02]">
          <div className="border-b border-white/8 px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-zinc-500">Selected thread</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {activeThread?.title ?? "Hermes thread"}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  {activeThread?.summary ??
                    "A narrow, readable chat surface for live operational notes and quick follow-up."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] text-zinc-500">
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
                  <Clock3 className="mr-2 inline-block h-3.5 w-3.5 text-zinc-400" />
                  {activeThread ? formatRelativeTime(activeThread.lastMessageAt) : "Waiting"}
                </span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
                  <MessageSquareText className="mr-2 inline-block h-3.5 w-3.5 text-zinc-400" />
                  {messages.length} message{messages.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid min-h-[66vh] gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex min-h-0 flex-col border-b border-white/8 lg:border-b-0 lg:border-r">
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                      No messages in this thread yet.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const tone = messageTone(message);
                      const Icon = tone.icon;

                      if (message.role === "system") {
                        return (
                          <div
                            key={message._id}
                            className="mx-auto max-w-[640px] rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-center text-[0.72rem] uppercase tracking-[0.22em] text-zinc-500"
                          >
                            {message.content}
                          </div>
                        );
                      }

                      return (
                        <article
                          key={message._id}
                          className={`max-w-[760px] rounded-[28px] px-4 py-4 ${tone.containerClassName}`}
                        >
                          <div className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.22em] text-zinc-500">
                            <Icon className={`h-3.5 w-3.5 ${tone.iconClassName}`} />
                            <span className="text-zinc-300">{message.author}</span>
                            <span>{formatRelativeTime(message.createdAt)}</span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                            {message.content}
                          </p>
                        </article>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-white/8 px-5 py-4">
                <label className="block text-[0.72rem] uppercase tracking-[0.24em] text-zinc-500">
                  Compose
                </label>
                <div className="mt-3 flex flex-col gap-3 rounded-[28px] border border-white/8 bg-white/[0.03] p-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Write to Hermes..."
                    rows={3}
                    className="min-h-[84px] resize-none border-0 bg-transparent text-sm leading-6 text-white outline-none placeholder:text-zinc-500"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.72rem] tracking-[0.18em] text-zinc-500">
                      Enter to send, Shift+Enter for a new line.
                    </p>
                    <button
                      type="submit"
                      disabled={!draft.trim() || isSending || !activeThreadId}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSending ? <Loader className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <aside className="space-y-5 px-5 py-5">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-zinc-500">Session</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-400">Active thread</span>
                    <span className="truncate text-right text-zinc-200">{activeThread?.title ?? "Hermes thread"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-400">Status</span>
                    <span className="text-zinc-200">
                      {isLoading ? "Loading" : isRealtime ? "Realtime connected" : "Snapshot ready"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-400">Source</span>
                    <span className="text-zinc-200">Convex thread log</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-zinc-500">Hermes notes</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                  <li>Seeded history ships with the screen so it feels alive on first load.</li>
                  <li>New messages append to the same Convex thread and keep the timeline synced.</li>
                  <li>The reply logic is deterministic for now, which keeps the demo stable and easy to verify.</li>
                </ul>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-zinc-500">Starter prompts</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PROMPTS.map((prompt) => (
                    <button
                      key={`rail-${prompt}`}
                      type="button"
                      onClick={() => setDraft(prompt)}
                      className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-2 text-left text-xs text-zinc-300 transition hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
