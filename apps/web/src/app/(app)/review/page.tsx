import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { ReviewSignalBadge } from "@/components/review-signal-badge";
import { ReviewCalendar } from "@/components/review-calendar";
import { serverFetch } from "@/lib/api";
import type { ReviewCalendarDay, ReviewQueueItem } from "@aida/shared";

export default async function ReviewPage() {
  const [due, calendar] = await Promise.all([
    serverFetch<ReviewQueueItem[]>("/review/due"),
    serverFetch<ReviewCalendarDay[]>("/review/calendar?days=14"),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Review</h1>
        <p className="mt-1 text-muted-foreground">
          What&apos;s worth revisiting before it fades, and what&apos;s already slipping.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Due now</h2>
        {due.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            <CalendarClock className="size-6" />
            Nothing due right now. Check back after your next study session.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {due.map((item) => (
              <Link
                key={item.topicId}
                href={`/library/${item.documentId}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 text-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:translate-y-0"
              >
                <div>
                  <p className="font-medium">{item.topicTitle}</p>
                  {item.documentTitle !== item.topicTitle && (
                    <p className="text-xs text-muted-foreground">{item.documentTitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {Math.round(item.masteryScore * 100)}% mastery
                  </span>
                  <ReviewSignalBadge signal={item.signal} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ReviewCalendar days={calendar} />
    </div>
  );
}
