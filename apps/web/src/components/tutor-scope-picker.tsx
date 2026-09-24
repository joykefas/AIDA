"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, BookOpen, Check, FileText, Globe } from "lucide-react";
import { cn } from "cn";
import { clientFetch } from "@/lib/api-client";
import type { DocumentListItem, TopicSummary } from "@aida/shared";

export interface TutorScopeValue {
  documentId: string | null;
  documentTitle: string | null;
  topicId: string | null;
  topicTitle: string | null;
  topics?: { id: string; title: string }[];
}

export function TutorScopePicker({
  value,
  onChange,
}: {
  value: TutorScopeValue;
  onChange: (scope: TutorScopeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentListItem[] | null>(null);
  const [topics, setTopics] = useState<TopicSummary[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (!documents) {
        clientFetch<DocumentListItem[]>("/documents").then(setDocuments);
      }
      if (!topics) {
        clientFetch<TopicSummary[]>("/topics").then(setTopics);
      }
    }
  }, [open, documents, topics]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Display label
  const displayLabel = value.documentTitle
    ? value.topicTitle
      ? `${value.documentTitle} › ${value.topicTitle}`
      : value.documentTitle
    : value.topicTitle ?? "All my material";

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
          Material:{" "}
          <span className="font-semibold text-foreground">{displayLabel}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180 text-foreground",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-border/90 bg-card/95 p-1 shadow-xl shadow-black/30 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Global material option */}
          <button
            className={cn(
              "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium outline-none transition-colors",
              "hover:bg-accent hover:text-foreground",
              value.documentId === null && value.topicId === null
                ? "bg-brand-500/10 text-brand-500 font-semibold dark:text-brand-400"
                : "text-muted-foreground",
            )}
            onClick={() => {
              onChange({
                documentId: null,
                documentTitle: null,
                topicId: null,
                topicTitle: null,
                topics: [],
              });
              setOpen(false);
            }}
          >
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 text-brand-500 shrink-0" />
              <span>All my materials (Global Conversation)</span>
            </div>
            {value.documentId === null && value.topicId === null && (
              <Check className="size-3.5 text-brand-500 shrink-0" />
            )}
          </button>

          <div className="-mx-1 my-1 h-px bg-border" />

          <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Study Materials:
          </div>

          <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
            {documents === null ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Loading materials…
              </p>
            ) : documents.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No materials uploaded yet.
              </p>
            ) : (
              documents.map((doc) => {
                const docTopics =
                  topics?.filter((t) => t.documentId === doc.id) ?? [];
                const isDocSelected =
                  value.documentId === doc.id && value.topicId === null;

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col rounded-lg border border-border/50 bg-background/50 p-1"
                  >
                    {/* Material button */}
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
                        isDocSelected
                          ? "bg-brand-500/15 text-brand-700 font-bold dark:text-brand-300"
                          : "text-foreground hover:bg-accent/60",
                      )}
                      onClick={() => {
                        onChange({
                          documentId: doc.id,
                          documentTitle: doc.title,
                          topicId: null,
                          topicTitle: null,
                          topics: docTopics.map((t) => ({
                            id: t.id,
                            title: t.title,
                          })),
                        });
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <FileText className="size-3 text-brand-500 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </div>
                      {isDocSelected && (
                        <Check className="size-3.5 text-brand-500 shrink-0" />
                      )}
                    </button>

                    {/* Subtopics */}
                    {docTopics.length > 0 && (
                      <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border/60 pl-2 py-0.5">
                        {docTopics.map((t) => {
                          const isTopicSelected = value.topicId === t.id;
                          return (
                            <button
                              key={t.id}
                              className={cn(
                                "flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors",
                                isTopicSelected
                                  ? "bg-brand-500/10 text-brand-600 font-semibold dark:text-brand-400"
                                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                              )}
                              onClick={() => {
                                onChange({
                                  documentId: doc.id,
                                  documentTitle: doc.title,
                                  topicId: t.id,
                                  topicTitle: t.title,
                                  topics: docTopics.map((item) => ({
                                    id: item.id,
                                    title: item.title,
                                  })),
                                });
                                setOpen(false);
                              }}
                            >
                              <span className="truncate pr-1">📌 {t.title}</span>
                              {isTopicSelected && (
                                <Check className="size-3 text-brand-500 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
