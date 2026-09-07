"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { cn } from "cn";
import { clientFetch } from "@/lib/api-client";
import type { TopicSummary } from "@aida/shared";

export function TutorScopePicker({
  value,
  onChange,
}: {
  value: { topicId: string | null; topicTitle: string | null };
  onChange: (scope: { topicId: string | null; topicTitle: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<TopicSummary[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !topics) {
      clientFetch<TopicSummary[]>("/topics").then(setTopics);
    }
  }, [open, topics]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <BookOpen className="size-3.5" />
        Asking about: <span className="font-medium text-foreground">{value.topicTitle ?? "all my material"}</span>
        <ChevronDown className="size-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-1 shadow-lg">
          <button
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
              value.topicId === null && "bg-accent",
            )}
            onClick={() => {
              onChange({ topicId: null, topicTitle: null });
              setOpen(false);
            }}
          >
            All my material
          </button>
          <div className="my-1 h-px bg-border" />
          <div className="max-h-64 overflow-y-auto">
            {topics === null ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Loading…</p>
            ) : topics.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No topics yet.</p>
            ) : (
              topics.map((t) => (
                <button
                  key={t.id}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    value.topicId === t.id && "bg-accent",
                  )}
                  onClick={() => {
                    onChange({ topicId: t.id, topicTitle: t.title });
                    setOpen(false);
                  }}
                >
                  {t.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
