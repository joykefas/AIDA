import { Flame, ClipboardList, CalendarCheck } from "lucide-react";
import { serverFetch } from "@/lib/api";
import type { WeeklyProgressReport } from "@aida/shared";

export default async function ProgressPage() {
  const report = await serverFetch<WeeklyProgressReport>("/progress/weekly");

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-muted-foreground">Your last 7 days, at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          icon={Flame}
          label="Current streak"
          value={`${report.currentStreakDays} day${report.currentStreakDays === 1 ? "" : "s"}`}
        />
        <StatTile icon={ClipboardList} label="Quizzes taken" value={String(report.quizzesTaken)} />
        <StatTile icon={CalendarCheck} label="Topics reviewed" value={String(report.reviewsCompleted)} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Strengths</h2>
          {report.strengths.length === 0 ? (
            <EmptyMastery />
          ) : (
            <div className="flex flex-col gap-2">
              {report.strengths.map((t) => (
                <MasteryRow key={t.topicId} label={t.topicTitle} score={t.masteryScore} tone="success" />
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Needs attention</h2>
          {report.weaknesses.length === 0 ? (
            <EmptyMastery />
          ) : (
            <div className="flex flex-col gap-2">
              {report.weaknesses.map((t) => (
                <MasteryRow key={t.topicId} label={t.topicTitle} score={t.masteryScore} tone="review" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MasteryRow({
  label,
  score,
  tone,
}: {
  label: string;
  score: number;
  tone: "success" | "review";
}) {
  const pct = Math.round(score * 100);
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone === "success" ? "bg-success-600" : "bg-review-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyMastery() {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      Not enough activity yet.
    </div>
  );
}
