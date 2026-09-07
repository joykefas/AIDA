"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, RefreshCcw, Timer, Flag, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/api-client";
import { cn } from "cn";
import { QuestionType, type QuizAttemptResult, type QuizQuestionDto } from "@aida/shared";

const SECONDS_PER_QUESTION = 60;

type Mode = "practice" | "timed";

export function QuizRunner({ topicId, documentId }: { topicId: string; documentId?: string }) {
  const [questions, setQuestions] = useState<QuizQuestionDto[] | null>(null);
  const [mode, setMode] = useState<Mode>("practice");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, QuizAttemptResult>>({});
  const [grading, setGrading] = useState(false);
  const [written, setWritten] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [examEnded, setExamEnded] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Dispute state
  const [disputedAttempts, setDisputedAttempts] = useState<Record<string, boolean>>({});
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    clientFetch<QuizQuestionDto[]>(`/topics/${topicId}/quiz`).then(setQuestions);
  }, [topicId]);

  useEffect(() => {
    if (mode !== "timed" || examEnded || timeLeft <= 0) return;
    const t = setTimeout(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          setExamEnded(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [mode, timeLeft, examEnded]);

  const current = questions?.[index];

  async function handleDispute(attemptId: string) {
    if (!disputeReason.trim()) return;
    setSubmittingDispute(true);
    try {
      await clientFetch(`/quiz/attempts/${attemptId}/dispute`, {
        method: "POST",
        body: JSON.stringify({ disputeReason }),
      });
      setDisputedAttempts((prev) => ({ ...prev, [attemptId]: true }));
      setDisputingId(null);
      setDisputeReason("");
    } catch (err) {
      console.error("Dispute submission failed", err);
    } finally {
      setSubmittingDispute(false);
    }
  }

  async function submitAnswer(answer: string) {
    if (!current || grading) return;
    setAnswers((prev) => ({ ...prev, [current.id]: answer }));

    if (mode === "practice") {
      setGrading(true);
      const result = await clientFetch<QuizAttemptResult>(`/quiz/${current.id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answer }),
      });
      setResults((prev) => ({ ...prev, [current.id]: result }));
      setGrading(false);
    } else {
      // Timed mode: record silently, grade in bulk once the exam ends.
      clientFetch<QuizAttemptResult>(`/quiz/${current.id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answer }),
      }).then((result) => setResults((prev) => ({ ...prev, [current.id]: result })));
    }
  }

  function next() {
    setWritten("");
    setIndex((i) => Math.min(i + 1, (questions?.length ?? 1) - 1));
  }

  async function generateMore() {
    setGenerating(true);
    const fresh = await clientFetch<QuizQuestionDto[]>(`/topics/${topicId}/quiz/generate`, { method: "POST" });
    setQuestions((prev) => [...(prev ?? []), ...fresh]);
    setGenerating(false);
  }

  const score = useMemo(() => {
    const graded = Object.values(results);
    if (graded.length === 0) return null;
    return Math.round((graded.reduce((sum, r) => sum + r.score, 0) / graded.length) * 100);
  }, [results]);

  if (!questions) return <p className="text-sm text-muted-foreground">Loading quiz…</p>;
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">No quiz questions yet.</p>
        <Button onClick={generateMore} disabled={generating}>
          {generating ? "Generating…" : "Generate a quiz"}
        </Button>
      </div>
    );
  }

  const revealFeedback = mode === "practice" || examEnded;
  const currentResult = current ? results[current.id] : undefined;
  const currentAnswer = current ? answers[current.id] : undefined;

  if (mode === "timed" && examEnded) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-heading text-xl font-semibold">Exam complete</h3>
        {score !== null && <p className="text-3xl font-semibold text-brand-600">{score}%</p>}
        <div className="flex flex-col gap-2">
          {questions.map((q, i) => {
            const r = results[q.id];
            return (
              <div key={q.id} className="flex items-center gap-2 text-sm">
                {r?.correct ? (
                  <CheckCircle2 className="size-4 text-success-600" />
                ) : (
                  <XCircle className="size-4 text-danger-600" />
                )}
                <span className="text-muted-foreground">Question {i + 1}</span>
              </div>
            );
          })}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setExamEnded(false);
            setResults({});
            setAnswers({});
            setIndex(0);
          }}
        >
          <RefreshCcw className="size-4" /> Retake
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
            {(["practice", "timed"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setIndex(0);
                  setResults({});
                  setAnswers({});
                  setExamEnded(false);
                  if (m === "timed" && questions) setTimeLeft(questions.length * SECONDS_PER_QUESTION);
                }}
                className={cn(
                  "rounded-md px-3 py-1 capitalize transition-colors",
                  mode === m ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {documentId && (
            <Link
              href={`/library/${documentId}/exam`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/60"
            >
              <GraduationCap className="size-3.5" /> Full Timed Exam &rarr;
            </Link>
          )}
        </div>

        {mode === "timed" && (
          <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
            <Timer className="size-4" />
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
        <h3 className="mb-5 font-heading text-lg font-semibold">{current?.prompt}</h3>

        {current?.type === QuestionType.MCQ ? (
          <div className="flex flex-col gap-2">
            {current.options?.map((opt) => {
              const selected = currentAnswer === opt.id;
              const isCorrect = revealFeedback && currentResult?.correctAnswer === opt.id;
              const isWrongSelected = revealFeedback && selected && currentResult && !currentResult.correct;
              return (
                <button
                  key={opt.id}
                  disabled={!!currentAnswer}
                  onClick={() => submitAnswer(opt.id)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    selected && !revealFeedback && "border-brand-600 bg-accent",
                    isCorrect && "border-success-600 bg-success-100 dark:bg-success-900/30",
                    isWrongSelected && "border-danger-600 bg-danger-100 dark:bg-danger-900/30",
                    !selected && !isCorrect && "border-border hover:border-brand-300 hover:bg-accent/40",
                  )}
                >
                  {opt.text}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={written}
              onChange={(e) => setWritten(e.target.value)}
              disabled={!!currentAnswer}
              className="min-h-28 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Write your answer…"
            />
            {!currentAnswer && (
              <Button onClick={() => submitAnswer(written)} disabled={!written.trim() || grading} className="self-start">
                {grading ? "Grading…" : "Submit"}
              </Button>
            )}
          </div>
        )}

        {revealFeedback && currentResult && (
          <div className="mt-4 flex flex-col gap-2">
            <div
              className={cn(
                "rounded-xl p-3 text-sm",
                currentResult.correct
                  ? "bg-success-100 text-success-900 dark:bg-success-900/30 dark:text-success-100"
                  : "bg-danger-100 text-danger-900 dark:bg-danger-900/30 dark:text-danger-100",
              )}
            >
              {current?.type === QuestionType.WRITTEN && (
                <p className="mb-1 font-semibold">{Math.round(currentResult.score * 100)}%</p>
              )}
              {currentResult.feedback}
            </div>

            {currentResult.attemptId && (
              <div className="mt-1 flex flex-col items-start gap-1">
                {disputedAttempts[currentResult.attemptId] ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand-600">
                    <CheckCircle2 className="size-3.5" /> Grade dispute submitted for educator review
                  </span>
                ) : disputingId === currentResult.attemptId ? (
                  <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-foreground">Why do you believe this evaluation is incorrect?</p>
                    <input
                      type="text"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="e.g. My answer covers the core mechanism outlined in lecture 3"
                      className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:border-ring"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={submittingDispute || !disputeReason.trim()}
                        onClick={() => handleDispute(currentResult.attemptId!)}
                      >
                        {submittingDispute ? "Submitting…" : "Submit dispute"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setDisputingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDisputingId(currentResult.attemptId!);
                      setDisputeReason("");
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    <Flag className="size-3" /> Dispute grading
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={generateMore} disabled={generating}>
          {generating ? "Generating…" : "More questions"}
        </Button>
        {index < questions.length - 1 ? (
          <Button onClick={next} disabled={!currentAnswer}>
            Next
          </Button>
        ) : (
          mode === "timed" && (
            <Button onClick={() => setExamEnded(true)} disabled={!currentAnswer}>
              Finish exam
            </Button>
          )
        )}
      </div>
    </div>
  );
}
