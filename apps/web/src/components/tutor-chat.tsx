"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  X,
  MessageSquare,
  Layers,
  ChevronDown,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/api-client";
import type { TutorChatMessage } from "@aida/shared";
import { cn } from "cn";

export function TutorChat({
  documentId,
  documentTitle,
  topicId,
  topicTitle,
  topics,
  header,
}: {
  documentId?: string;
  documentTitle?: string;
  topicId?: string;
  topicTitle?: string;
  topics?: { id: string; title: string }[];
  header?: React.ReactNode;
}) {
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [feedbackPopover, setFeedbackPopover] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const hasSentRef = useRef(false);

  // Topic differentiation state inside this material
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    topicId ?? null,
  );
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Adjust selectedTopicId during render when topicId prop changes
  const [prevTopicId, setPrevTopicId] = useState(topicId);
  if (topicId !== prevTopicId) {
    setPrevTopicId(topicId);
    setSelectedTopicId(topicId ?? null);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setTopicDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const scopeKey = `${documentId ?? ""}_${topicId ?? ""}`;
  const [renderedScopeKey, setRenderedScopeKey] = useState(scopeKey);
  if (scopeKey !== renderedScopeKey) {
    setRenderedScopeKey(scopeKey);
    setLoadingHistory(true);
  }

  useEffect(() => {
    hasSentRef.current = false;
    let url = "/tutor/history";
    const params = new URLSearchParams();
    if (documentId) {
      params.set("documentId", documentId);
    } else if (topicId) {
      params.set("topicId", topicId);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    clientFetch<TutorChatMessage[]>(url)
      .then((history) => {
        if (!hasSentRef.current) setMessages(history);
      })
      .finally(() => setLoadingHistory(false));
  }, [documentId, topicId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function rateMessage(
    messageId: string,
    rating: "HELPFUL" | "UNHELPFUL",
    feedback?: string,
  ) {
    if (messageId.startsWith("local-")) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, rating } : msg)),
    );
    setFeedbackPopover(null);
    setFeedbackText("");
    try {
      await clientFetch(`/tutor/messages/${messageId}/rate`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          ...(feedback ? { feedbackText: feedback } : {}),
        }),
      });
    } catch {
      // silent fallback
    }
  }

  async function send(message: string, simplify = false) {
    if (!message.trim() || loading) return;
    hasSentRef.current = true;
    setLoading(true);
    const tempId = `local-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user",
        content: message,
        documentId,
        topicId: selectedTopicId ?? undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");
    try {
      const res = await clientFetch<{
        id: string;
        answer: string;
        citations: TutorChatMessage["citations"];
        createdAt: string;
      }>("/tutor", {
        method: "POST",
        body: JSON.stringify({
          message,
          documentId,
          topicId: selectedTopicId ?? undefined,
          simplify,
        }),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: res.id,
          role: "assistant",
          content: res.answer,
          documentId,
          topicId: selectedTopicId ?? undefined,
          citations: res.citations,
          createdAt: res.createdAt,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-err-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I ran into an error generating an answer. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const activeTopicObj = topics?.find((t) => t.id === selectedTopicId);
  const activeTopicName = activeTopicObj
    ? activeTopicObj.title
    : topics && topics.length > 0
      ? "All Topics in Material"
      : (topicTitle ?? "all my material");

  return (
    <div className="flex h-[34rem] flex-col rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 bg-muted/20">
        {header ? (
          header
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-brand-600 shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Material:{" "}
                <span className="font-semibold text-foreground">
                  {documentTitle ?? topicTitle ?? "All my material"}
                </span>
              </span>
            </div>

            {/* Dropdown to differentiate topic within this material */}
            {topics && topics.length > 0 && (
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setTopicDropdownOpen((o) => !o)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-accent select-none",
                    topicDropdownOpen &&
                      "border-brand-500/50 ring-2 ring-brand-500/20",
                  )}
                >
                  <Layers className="size-3.5 text-brand-500 shrink-0" />
                  <span className="text-muted-foreground font-normal">
                    Topic:
                  </span>
                  <span className="max-w-[170px] truncate font-semibold">
                    {selectedTopicId ? activeTopicObj?.title : "All Topics"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3 text-muted-foreground transition-transform duration-150",
                      topicDropdownOpen && "rotate-180",
                    )}
                  />
                </button>

                {topicDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border/90 bg-card p-1 shadow-xl shadow-black/20 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Differentiate Topic In Material:
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopicId(null);
                        setTopicDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                        selectedTopicId === null
                          ? "bg-brand-500/10 text-brand-600 font-semibold dark:text-brand-400"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span className="truncate">
                        📚 All Topics in Material
                      </span>
                      {selectedTopicId === null && (
                        <Check className="size-3.5 text-brand-500 shrink-0" />
                      )}
                    </button>

                    <div className="-mx-1 my-1 h-px bg-border" />

                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
                      {topics.map((t) => {
                        const isSelected = selectedTopicId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTopicId(t.id);
                              setTopicDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                              isSelected
                                ? "bg-brand-500/10 text-brand-600 font-semibold dark:text-brand-400"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            <span className="truncate pr-2">📌 {t.title}</span>
                            {isSelected && (
                              <Check className="size-3.5 text-brand-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loadingHistory ? (
          <p className="text-sm text-muted-foreground">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ask anything about{" "}
            {documentTitle
              ? `"${documentTitle}"`
              : topicTitle
                ? `"${topicTitle}"`
                : "your uploaded material"}
            .
            {topics &&
              topics.length > 0 &&
              " Use the topic dropdown above to differentiate questions across topics in this material."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => {
              const matchedTopic = m.topicId
                ? topics?.find((t) => t.id === m.topicId)
                : null;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col gap-1",
                    m.role === "user" && "items-end",
                  )}
                >
                  {/* Topic badge for message */}
                  {m.role === "user" && (m.topicId || m.documentId) && (
                    <span className="text-[10px] font-medium text-muted-foreground px-1">
                      {matchedTopic
                        ? `📌 ${matchedTopic.title}`
                        : m.documentId
                          ? "📚 Entire Material"
                          : null}
                    </span>
                  )}

                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-brand-600 text-white whitespace-pre-wrap"
                        : "border border-border/60 bg-muted/80 text-foreground shadow-2xs",
                    )}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2.5 last:mb-0 leading-relaxed text-pretty">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic">{children}</em>
                            ),
                            ul: ({ children }) => (
                              <ul className="my-2 list-disc space-y-1 pl-5">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="my-2 list-decimal space-y-1 pl-5">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-relaxed">{children}</li>
                            ),
                            h1: ({ children }) => (
                              <h3 className="mt-3 mb-1.5 text-base font-semibold text-foreground">
                                {children}
                              </h3>
                            ),
                            h2: ({ children }) => (
                              <h4 className="mt-2.5 mb-1 text-sm font-semibold text-foreground">
                                {children}
                              </h4>
                            ),
                            h3: ({ children }) => (
                              <h5 className="mt-2 mb-1 text-sm font-semibold text-foreground">
                                {children}
                              </h5>
                            ),
                            code: ({ children, className }) => {
                              const isBlock = className?.includes("language-");
                              return isBlock ? (
                                <code className="font-mono text-xs">
                                  {children}
                                </code>
                              ) : (
                                <code className="rounded bg-muted-foreground/15 px-1 py-0.5 font-mono text-xs text-foreground">
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ children }) => (
                              <pre className="my-2 overflow-x-auto rounded-xl border border-border bg-card/90 p-3 font-mono text-xs leading-normal text-foreground">
                                {children}
                              </pre>
                            ),
                            table: ({ children }) => (
                              <div className="my-2 overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-left text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="border-b border-border bg-muted/50">
                                {children}
                              </thead>
                            ),
                            tbody: ({ children }) => (
                              <tbody className="divide-y divide-border">
                                {children}
                              </tbody>
                            ),
                            th: ({ children }) => (
                              <th className="px-3 py-2 font-semibold text-foreground">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-3 py-1.5">{children}</td>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="my-2 border-l-2 border-brand-500 pl-3 italic text-muted-foreground">
                                {children}
                              </blockquote>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {m.role === "assistant" && (
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {m.citations && m.citations.length > 0 && (
                          <span>from {m.citations[0].topicTitle}</span>
                        )}
                        <button
                          onClick={() => send("Simplify that", true)}
                          className="inline-flex items-center gap-1 text-brand-600 transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-400"
                        >
                          <Sparkles className="size-3" /> Simplify this
                        </button>
                      </div>
                      {!m.id.startsWith("local-") && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => rateMessage(m.id, "HELPFUL")}
                            className={cn(
                              "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                              m.rating === "HELPFUL" &&
                                "bg-brand-50 text-brand-600 dark:bg-brand-950/50",
                            )}
                            title="Helpful"
                            aria-label="Helpful"
                          >
                            <ThumbsUp className="size-3.5" />
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (m.rating === "UNHELPFUL") return;
                                setFeedbackPopover(
                                  feedbackPopover === m.id ? null : m.id,
                                );
                                setFeedbackText("");
                              }}
                              className={cn(
                                "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                m.rating === "UNHELPFUL" &&
                                  "bg-red-50 text-red-500 dark:bg-red-950/50",
                              )}
                              title="Unhelpful"
                              aria-label="Unhelpful"
                            >
                              <ThumbsDown className="size-3.5" />
                            </button>
                            {feedbackPopover === m.id && (
                              <div className="absolute bottom-8 right-0 z-20 w-64 rounded-xl border border-border bg-card p-3 shadow-lg">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                    <MessageSquare className="size-3.5" />
                                    What went wrong? (optional)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setFeedbackPopover(null)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                                <textarea
                                  value={feedbackText}
                                  onChange={(e) =>
                                    setFeedbackText(e.target.value)
                                  }
                                  placeholder="Too complex, inaccurate, missed something..."
                                  className="w-full resize-none rounded-lg border border-border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none"
                                  rows={2}
                                />
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      rateMessage(
                                        m.id,
                                        "UNHELPFUL",
                                        feedbackText,
                                      )
                                    }
                                    className="h-6 px-2 text-xs"
                                  >
                                    Submit
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3 bg-card"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${activeTopicName}…`}
          disabled={loading}
          className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={!input.trim() || loading}
          size="sm"
          className="gap-1.5"
        >
          <Send className="size-3.5" />
          <span>Ask</span>
        </Button>
      </form>
    </div>
  );
}
