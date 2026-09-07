"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Timer, AlertCircle, Award, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import { cn } from "cn";
import { QuestionType, type ExamResultDto, type ExamSessionDto } from "@aida/shared";

export function ExamRunner({ topicId, documentId }: { topicId: string; documentId: string }) {
  const [session, setSession] = useState<ExamSessionDto | null>(null);
  const [results, setResults] = useState<ExamResultDto | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (!session || results || timeLeft <= 0) return;
    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [session, results, timeLeft]);

  async function startExam() {
    setLoading(true);
    setError(null);
    try {
      const data = await clientFetch<ExamSessionDto>("/exam/start", {
        method: "POST",
        body: JSON.stringify({ topicId }),
      });
      setSession(data);
      setTimeLeft(data.durationMinutes * 60);
      setIndex(0);
      setAnswers({});
      setResults(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to start exam. Ensure quiz questions exist.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!session || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payloadAnswers = session.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? "",
      }));

      const res = await clientFetch<ExamResultDto>(`/exam/${session.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: payloadAnswers }),
      });
      setResults(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to submit exam.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAutoSubmit() {
    if (!submitting && session && !results) {
      handleSubmit();
    }
  }

  // Pre-exam Start View
  if (!session) {
    return (
      <div className="flex flex-col gap-6 max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 mx-auto dark:bg-brand-950 dark:text-brand-300">
          <Timer className="size-7" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-semibold">Timed Mock Exam</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Simulate real assessment conditions with a strict countdown timer. Feedback and scoring will be withheld
            until all answers are submitted at the end.
          </p>
        </div>

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href={`/library/${documentId}`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="size-4 mr-1.5" /> Back to Notes
            </Button>
          </Link>
          <Button onClick={startExam} disabled={loading} className="w-full sm:w-auto">
            {loading ? "Preparing Exam…" : "Begin Exam"}
          </Button>
        </div>
      </div>
    );
  }

  // Post-Exam Results View
  if (results) {
    return (
      <div className="flex flex-col gap-8 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <Award className="size-8" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold">Exam Results</h2>
              <p className="text-sm text-muted-foreground">
                Completed on {new Date(results.completedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand-600">{results.overallScore}%</p>
            <p className="text-xs text-muted-foreground">
              {results.correctQuestions} of {results.totalQuestions} correct
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="font-heading text-lg font-semibold">Question Breakdown</h3>
          {results.results.map((res, i) => (
            <div key={res.questionId} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">
                  Question {i + 1}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {res.correct ? (
                    <span className="inline-flex items-center gap-1 text-success-600">
                      <CheckCircle2 className="size-4" /> Correct (100%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger-600">
                      <XCircle className="size-4" /> {Math.round(res.score * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="text-sm rounded-lg bg-muted/40 p-3 flex flex-col gap-1">
                <p className="text-xs text-muted-foreground font-medium">Your answer:</p>
                <p>{res.userAnswer || <span className="italic text-muted-foreground">(No answer provided)</span>}</p>
              </div>

              {res.correctAnswer && (
                <div className="text-sm rounded-lg bg-success-50/50 dark:bg-success-950/20 p-3 flex flex-col gap-1">
                  <p className="text-xs text-success-700 font-medium dark:text-success-300">Correct answer:</p>
                  <p>{res.correctAnswer}</p>
                </div>
              )}

              {res.feedback && (
                <div className="text-sm rounded-lg bg-accent/40 p-3 flex flex-col gap-1">
                  <p className="text-xs text-brand-700 font-medium dark:text-brand-300">Feedback:</p>
                  <p className="text-muted-foreground">{res.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          <Link href={`/library/${documentId}`}>
            <Button variant="outline">
              <ArrowLeft className="size-4 mr-1.5" /> Return to Notes
            </Button>
          </Link>
          <Button onClick={startExam}>
            <RotateCcw className="size-4 mr-1.5" /> Retake Exam
          </Button>
        </div>
      </div>
    );
  }

  const current = session.questions[index];
  const currentAnswer = current ? answers[current.id] ?? "" : "";
  const isUrgent = timeLeft < 60;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Timer Bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <span className="text-xs font-medium text-muted-foreground">
          Question {index + 1} of {session.questions.length}
        </span>
        <div
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold tabular-nums px-2.5 py-1 rounded-lg transition-colors",
            isUrgent
              ? "bg-danger-100 text-danger-700 animate-pulse dark:bg-danger-900/30 dark:text-danger-300"
              : "bg-muted text-foreground",
          )}
        >
          <Timer className="size-4" />
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      </div>

      {/* Active Question */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
        <h3 className="font-heading text-lg font-semibold">{current.prompt}</h3>

        {current.type === QuestionType.MCQ ? (
          <div className="flex flex-col gap-2 pt-2">
            {current.options?.map((opt) => {
              const selected = currentAnswer === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: opt.id }))}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm transition-all",
                    selected
                      ? "border-brand-600 bg-brand-50/50 text-foreground ring-2 ring-brand-600/20 dark:bg-brand-950/40"
                      : "border-border hover:border-brand-300 hover:bg-accent/40",
                  )}
                >
                  {opt.text}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-2">
            <textarea
              value={currentAnswer}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
              placeholder="Type your detailed explanation or answer here…"
              className="min-h-36 w-full rounded-xl border border-input bg-background p-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Previous
        </Button>

        {index < session.questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => Math.min(session.questions.length - 1, i + 1))}>
            Next Question
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Grading Exam…" : "Submit Exam"}
          </Button>
        )}
      </div>

      {error && <p className="text-center text-sm text-danger-600">{error}</p>}
    </div>
  );
}
