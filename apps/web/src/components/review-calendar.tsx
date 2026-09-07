"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CalendarClock } from "lucide-react";
import { ReviewSignalBadge } from "@/components/review-signal-badge";
import { DURATION, EASE, MOTION_QUERIES, STAGGER } from "@/lib/motion";
import { ReviewSignal, type ReviewCalendarDay } from "@aida/shared";
import { cn } from "cn";

gsap.registerPlugin(useGSAP);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** The 14-day forecast strip plus the list of what's actually scheduled on
 * whichever day is selected — the calendar used to be decoration (a dot
 * meant "something's here" with no way to see what). Defaults to today, so
 * it opens already showing something instead of an empty panel. */
export function ReviewCalendar({ days }: { days: ReviewCalendarDay[] }) {
  const [selected, setSelected] = useState(todayKey());
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedDay = useMemo(() => days.find((d) => d.date === selected), [days, selected]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        gsap.from(".review-day-item", {
          opacity: 0,
          y: 8,
          duration: DURATION.fast,
          ease: EASE.out,
          stagger: STAGGER.tight,
        });
      });
    },
    { scope: panelRef, dependencies: [selected] },
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Next 14 days</h2>

      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-14 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {days.map((day) => {
            const date = new Date(day.date);
            const isToday = day.date === todayKey();
            const isSelected = day.date === selected;
            const needsReview = day.items.some((i) => i.signal === ReviewSignal.NEEDS_REVIEW);
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelected(day.date)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-14 shrink-0 snap-center flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors sm:w-auto",
                  isSelected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : isToday
                      ? "border-brand-600 bg-brand-50 dark:bg-brand-950"
                      : "border-border hover:border-brand-300 hover:bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] uppercase",
                    isSelected ? "text-brand-100" : "text-muted-foreground",
                  )}
                >
                  {date.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="text-sm font-medium">{date.getDate()}</span>
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                    day.items.length === 0
                      ? "invisible"
                      : isSelected
                        ? "bg-white/25 text-white"
                        : needsReview
                          ? "bg-review-600 text-white"
                          : "bg-brand-600 text-white",
                  )}
                >
                  {day.items.length}
                </span>
              </button>
            );
          })}
        </div>

        <div ref={panelRef} className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">
            {new Date(selected).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {selectedDay && selectedDay.items.length > 0 && (
              <span className="ml-2 font-normal text-muted-foreground">
                · {selectedDay.items.length} {selectedDay.items.length === 1 ? "item" : "items"}
              </span>
            )}
          </h3>

          {!selectedDay || selectedDay.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              <CalendarClock className="size-5" />
              Nothing scheduled for this day.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDay.items.map((item) => (
                <Link
                  key={item.topicId}
                  href={`/library/${item.documentId}`}
                  className="review-day-item flex items-center justify-between rounded-xl border border-border bg-background p-3.5 text-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:translate-y-0"
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
        </div>
      </div>
    </section>
  );
}
