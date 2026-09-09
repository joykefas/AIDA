"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, BookOpen, Check } from "lucide-react";
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
        aria-expanded={open}
        className={cn(
          "group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 select-none",
          "hover:border-border hover:bg-accent/50 hover:text-foreground",
          "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20 outline-none",
          open && "border-brand-500/50 bg-accent/40 text-foreground",
        )}
      >
        <BookOpen className="size-3.5 text-brand-500 shrink-0" />
        <span>
          Asking about:{" "}
          <span className="font-semibold text-foreground">
            {value.topicTitle ?? "all my material"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180 text-foreground",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border/90 bg-card/95 p-1 shadow-xl shadow-black/30 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
          <button
            className={cn(
              "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors",
              "hover:bg-accent hover:text-foreground",
              value.topicId === null
                ? "bg-brand-500/10 text-brand-500 font-semibold dark:text-brand-400"
                : "text-muted-foreground",
            )}
            onClick={() => {
              onChange({ topicId: null, topicTitle: null });
              setOpen(false);
            }}
          >
            <span>All my material</span>
            {value.topicId === null && <Check className="size-3.5 text-brand-500 shrink-0" />}
          </button>

          <div className="-mx-1 my-1 h-px bg-border" />

          <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5">
            {topics === null ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
            ) : topics.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No topics yet.</p>
            ) : (
              topics.map((t) => {
                const isSelected = value.topicId === t.id;
                return (
                  <button
                    key={t.id}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium outline-none transition-colors",
                      "hover:bg-accent hover:text-foreground",
                      isSelected
                        ? "bg-brand-500/10 text-brand-500 font-semibold dark:text-brand-400"
                        : "text-muted-foreground",
                    )}
                    onClick={() => {
                      onChange({ topicId: t.id, topicTitle: t.title });
                      setOpen(false);
                    }}
                  >
                    <span className="truncate pr-2">{t.title}</span>
                    {isSelected && <Check className="size-3.5 text-brand-500 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
