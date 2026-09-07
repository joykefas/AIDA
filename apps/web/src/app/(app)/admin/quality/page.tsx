"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Search, HelpCircle, User } from "lucide-react";
import { clientFetch } from "@/lib/api-client";
import type { AdminQualitySampleItem } from "@aida/shared";
import { cn } from "cn";

export default function AdminQualityPage() {
  const [samples, setSamples] = useState<AdminQualitySampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "disputed">("disputed");

  useEffect(() => {
    clientFetch<AdminQualitySampleItem[]>("/admin/quality")
      .then(setSamples)
      .catch((err) => setError(err.message || "Failed to load quality samples"))
      .finally(() => setLoading(false));
  }, []);

  const disputedCount = samples.filter((s) => s.isDisputed).length;
  const filtered = filter === "disputed" ? samples.filter((s) => s.isDisputed) : samples;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">AI Grading Quality & Disputes</h2>
          <p className="text-sm text-muted-foreground">
            Sampled quiz evaluations and student dispute appeals for human educator oversight.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-xs">
          <button
            onClick={() => setFilter("disputed")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors",
              filter === "disputed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <AlertTriangle className="size-3 text-amber-500" />
            Contested Disputes ({disputedCount})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition-colors",
              filter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All Samples ({samples.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-900 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading evaluation samples…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
          <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
          <p className="font-medium text-foreground">No contested evaluations pending</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter === "disputed"
              ? "All quiz attempts are currently undisputed."
              : "No quiz evaluations recorded yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => {
            const scorePct = item.score !== null ? Math.round(item.score * 100) : null;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-5 transition-colors bg-card",
                  item.isDisputed
                    ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10"
                    : "border-border",
                )}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="size-3.5" />
                    <span className="font-medium text-foreground">{item.userEmail}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.isDisputed && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        <AlertTriangle className="size-3" /> Contested
                      </span>
                    )}
                    {scorePct !== null && (
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-semibold",
                          scorePct >= 70
                            ? "bg-success-100 text-success-800 dark:bg-success-950 dark:text-success-300"
                            : "bg-danger-100 text-danger-800 dark:bg-danger-950 dark:text-danger-300",
                        )}
                      >
                        Score: {scorePct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Question */}
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">QUESTION PROMPT</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.questionPrompt}</p>
                </div>

                {/* Answers grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs font-semibold text-muted-foreground">STUDENT ANSWER</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{item.userAnswer || "(No answer recorded)"}</p>
                  </div>

                  {item.correctAnswer && (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs font-semibold text-muted-foreground">REFERENCE ANSWER / CRITERIA</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{item.correctAnswer}</p>
                    </div>
                  )}
                </div>

                {/* AI Feedback */}
                {item.aiFeedback && (
                  <div className="rounded-xl bg-muted/30 p-3 text-xs">
                    <span className="font-semibold text-muted-foreground">AI EVALUATION: </span>
                    <span className="text-foreground">{item.aiFeedback}</span>
                  </div>
                )}

                {/* Dispute reason if disputed */}
                {item.isDisputed && item.disputeReason && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <span className="font-bold">STUDENT DISPUTE REASON: </span>
                    <span>&ldquo;{item.disputeReason}&rdquo;</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
