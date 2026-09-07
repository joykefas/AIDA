"use client";

import { Fragment, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Upload, Lightbulb, PencilLine, CheckCircle2, CalendarClock } from "lucide-react";
import { MOTION_QUERIES, DURATION, EASE, STAGGER } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  { icon: Upload, label: "Upload" },
  { icon: Lightbulb, label: "Understand" },
  { icon: PencilLine, label: "Practice" },
  { icon: CheckCircle2, label: "Get graded" },
  { icon: CalendarClock, label: "Review" },
] as const;

export function LoopTeaser() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        gsap.from(".loop-teaser-step", {
          opacity: 0,
          y: 16,
          duration: DURATION.base,
          ease: EASE.out,
          stagger: STAGGER.base,
          scrollTrigger: { trigger: root.current, start: "top 80%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative isolate mx-auto max-w-5xl px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/2 -z-10 size-[26rem] -translate-y-1/2 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-950/40"
      />

      <div className="mb-12 text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          One connected loop, not five separate apps
        </h2>
      </div>

      {/* Mobile: a plain vertical list, order alone conveys the sequence. */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        {STEPS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="loop-teaser-step flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
              <Icon className="size-4.5" />
            </div>
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Desktop: horizontal row with connecting arrows. */}
      <div className="hidden items-center justify-between sm:flex">
        {STEPS.map(({ icon: Icon, label }, i) => (
          <Fragment key={label}>
            <div className="loop-teaser-step flex flex-col items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                <Icon className="size-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="loop-teaser-step size-4 shrink-0 text-muted-foreground/50" />
            )}
          </Fragment>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:hover:text-brand-400"
        >
          See how it works
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
