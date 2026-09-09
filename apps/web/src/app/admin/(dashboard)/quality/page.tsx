"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  ThumbsDown,
} from "lucide-react";
import { clientFetch } from "@/lib/api-client";
import type { AdminQualityData } from "@aida/shared";
import { cn } from "cn";

export default function AdminQualityPage() {
  const [data, setData] = useState<AdminQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"quizzes" | "tutor" | "failures">("quizzes");
  const [quizFilter, setQuizFilter] = useState<"all" | "disputed">("disputed");

  useEffect(() => {
    clientFetch<AdminQualityData>("/admin/quality")
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load quality data"))
      .finally(() => setLoading(false));
  }, []);

  const quizzes = data?.disputedQuizzes ?? [];
  const flaggedTutor = data?.flaggedTutorMessages ?? [];
  const failures = data?.ingestionFailures ?? [];

  const disputedQuizzes = quizzes.filter((s) => s.isDisputed);
  const displayedQuizzes = quizFilter === "disputed" ? disputedQuizzes : quizzes;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Quality Oversight & Diagnostics</h2>
          <p className="text-sm text-muted-foreground">
            Monitor AI grading accuracy, review flagged tutor answers, and inspect document ingestion pipeline failures.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs">
          <button
            onClick={() => setActiveTab("quizzes")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors",
              activeTab === "quizzes"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <AlertTriangle className="size-3 text-amber-500" />
            Quiz Disputes ({disputedQuizzes.length})
          </button>
          <button
            onClick={() => setActiveTab("tutor")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors",
              activeTab === "tutor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ThumbsDown className="size-3 text-rose-500" />
            Flagged Tutor Chats ({flaggedTutor.length})
          </button>
          <button
            onClick={() => setActiveTab("failures")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors",
              activeTab === "failures"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <XCircle className="size-3 text-rose-500" />
            Ingestion Failures ({failures.length})
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
          <p className="text-sm text-muted-foreground">Loading diagnostics and quality data…</p>
        </div>
      ) : activeTab === "quizzes" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quiz Answer Evaluations
            </span>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setQuizFilter("disputed")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  quizFilter === "disputed"
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Disputed Only ({disputedQuizzes.length})
              </button>
              <span>•</span>
              <button
                onClick={() => setQuizFilter("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  quizFilter === "all"
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All Samples ({quizzes.length})
              </button>
            </div>
          </div>

          {displayedQuizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
              <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
              <p className="font-medium text-foreground">No contested evaluations pending</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {quizFilter === "disputed"
                  ? "All quiz attempts are currently undisputed."
                  : "No quiz evaluations recorded yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {displayedQuizzes.map((item) => {
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

                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">QUESTION PROMPT</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{item.questionPrompt}</p>
                    </div>

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

                    {item.aiFeedback && (
                      <div className="rounded-xl bg-muted/30 p-3 text-xs">
                        <span className="font-semibold text-muted-foreground">AI EVALUATION: </span>
                        <span className="text-foreground">{item.aiFeedback}</span>
                      </div>
                    )}

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
      ) : activeTab === "tutor" ? (
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Flagged Tutor Conversations (Disliked or with Feedback)
          </span>

          {flaggedTutor.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
              <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
              <p className="font-medium text-foreground">No negative tutor ratings recorded</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Students have not flagged or reported any grounded tutor explanations.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {flaggedTutor.map((msg) => (
                <div
                  key={msg.id}
                  className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/20 p-5 dark:border-rose-900/40 dark:bg-rose-950/10"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5" />
                      <span className="font-medium text-foreground">{msg.userEmail}</span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      <ThumbsDown className="size-3" /> Flagged Answer
                    </span>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">TUTOR EXPLANATION</p>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {msg.feedbackText && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                      <span className="font-bold">USER FEEDBACK: </span>
                      <span>&ldquo;{msg.feedbackText}&rdquo;</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Document Ingestion Failures
          </span>

          {failures.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
              <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
              <p className="font-medium text-foreground">No processing failures recorded</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All document parsing, transcription, and embedding jobs are running smoothly.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {failures.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 text-brand-600" />
                      <span className="font-medium text-foreground">{f.title}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 uppercase font-mono text-[10px]">
                        {f.type}
                      </span>
                    </div>
                    <span>{new Date(f.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-900 dark:border-danger-900/60 dark:bg-danger-950/40 dark:text-danger-200">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <XCircle className="size-3.5 text-danger-600" />
                      FAILURE REASON
                    </div>
                    <p className="whitespace-pre-wrap">{f.failureReason || "Unknown ingestion error."}</p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span>Uploaded by: </span>
                    <span className="font-medium text-foreground">{f.userEmail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
