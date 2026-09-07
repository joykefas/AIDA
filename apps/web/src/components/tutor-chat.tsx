"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, BookOpen, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/api-client";
import type { TutorChatMessage } from "@aida/shared";
import { cn } from "cn";

export function TutorChat({
  topicId,
  topicTitle,
  header,
}: {
  topicId?: string;
  topicTitle?: string;
  header?: React.ReactNode;
}) {
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Guards against the history fetch resolving after the user has already
  // sent a message (e.g. switching tabs and typing immediately) — without
  // this, the late history response overwrites state and silently wipes the
  // optimistic message that was just added.
  const hasSentRef = useRef(false);

  // Reset per-topic state during render when the scope changes, rather than
  // in an effect — this is React's recommended "adjust state on prop
  // change" pattern (react.dev/learn/you-might-not-need-an-effect), and
  // keeps the fetch effect below free of synchronous setState calls.
  const [renderedTopicId, setRenderedTopicId] = useState(topicId);
  if (topicId !== renderedTopicId) {
    setRenderedTopicId(topicId);
    setLoadingHistory(true);
  }

  useEffect(() => {
    hasSentRef.current = false;
    clientFetch<TutorChatMessage[]>(`/tutor/history${topicId ? `?topicId=${topicId}` : ""}`)
      .then((history) => {
        if (!hasSentRef.current) setMessages(history);
      })
      .finally(() => setLoadingHistory(false));
  }, [topicId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function rateMessage(messageId: string, rating: "HELPFUL" | "UNHELPFUL") {
    if (messageId.startsWith("local-")) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, rating } : msg)),
    );
    try {
      await clientFetch(`/tutor/messages/${messageId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
    } catch {
      // silent fallback
    }
  }

  async function send(message: string, simplify = false) {
    if (!message.trim() || loading) return;
    hasSentRef.current = true;
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: message, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    try {
      const res = await clientFetch<{ id: string; answer: string; citations: TutorChatMessage["citations"]; createdAt: string }>(
        "/tutor",
        { method: "POST", body: JSON.stringify({ message, topicId, simplify }) },
      );
      setMessages((prev) => [
        ...prev,
        { id: res.id, role: "assistant", content: res.answer, citations: res.citations, createdAt: res.createdAt },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I ran into an error generating an answer. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {header ?? (
          <>
            <BookOpen className="size-4 text-brand-600" />
            <span className="text-sm text-muted-foreground">
              Asking about:{" "}
              <span className="font-medium text-foreground">{topicTitle ?? "all my material"}</span>
            </span>
          </>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loadingHistory ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask anything about {topicTitle ? "this topic" : "your uploaded material"}. Answers are
            grounded in what you&apos;ve actually uploaded.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-1", m.role === "user" && "items-end")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    m.role === "user"
                      ? "bg-brand-600 text-white"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
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
                            m.rating === "HELPFUL" && "bg-brand-50 text-brand-600 dark:bg-brand-950/50",
                          )}
                          title="Helpful"
                          aria-label="Helpful"
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rateMessage(m.id, "UNHELPFUL")}
                          className={cn(
                            "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                            m.rating === "UNHELPFUL" && "bg-red-50 text-red-500 dark:bg-red-950/50",
                          )}
                          title="Unhelpful"
                          aria-label="Unhelpful"
                        >
                          <ThumbsDown className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && <p className="text-sm text-muted-foreground">Thinking…</p>}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
