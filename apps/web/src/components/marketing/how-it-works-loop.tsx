"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Upload, Lightbulb, PencilLine, CheckCircle2, CalendarClock } from "lucide-react";
import { MOTION_QUERIES } from "@/lib/motion";
import {
  UploadModesPreview,
  MindMapPreview,
  TutorPreview,
  GradingPreview,
  ReviewPreview,
} from "@/components/marketing/product-previews";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STAGES = [
  {
    icon: Upload,
    label: "Upload",
    title: "Bring in whatever you already have",
    body: "A PDF chapter, a recorded lecture, a YouTube link, or notes typed at 1am. AIDA takes it as-is.",
    preview: UploadModesPreview,
  },
  {
    icon: Lightbulb,
    label: "Understand",
    title: "It becomes notes, a mind map, and a first quiz",
    body: "Condensed notes, an interactive concept map, and practice questions pulled straight from your material, in minutes.",
    preview: MindMapPreview,
  },
  {
    icon: PencilLine,
    label: "Practice",
    title: "Ask the tutor, or take the quiz",
    body: "A tutor grounded in your own material, not a generic web answer, plus multiple choice, written response, and a timed exam mode.",
    preview: TutorPreview,
  },
  {
    icon: CheckCircle2,
    label: "Get graded",
    title: "Real feedback, not just a score",
    body: "Multiple choice grades instantly. Written answers get a percentage and specific feedback, the way a teaching assistant would mark it.",
    preview: GradingPreview,
  },
  {
    icon: CalendarClock,
    label: "Review",
    title: "It tells you what you're about to forget",
    body: "A spaced repetition schedule resurfaces topics before they fade, and flags anything missed twice in a row, so the loop starts again with what actually needs it.",
    preview: ReviewPreview,
  },
] as const;

function StagePanel({ stage, className }: { stage: (typeof STAGES)[number]; className?: string }) {
  const Icon = stage.icon;
  const Preview = stage.preview;
  return (
    <div className={className}>
      <div className="grid h-full gap-8 sm:grid-cols-[1.1fr_1fr] sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
            <Icon className="size-3.5" />
            {stage.label}
          </span>
          <h3 className="mt-4 text-balance font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {stage.title}
          </h3>
          <p className="mt-3 max-w-md text-muted-foreground">{stage.body}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Preview />
        </div>
      </div>
    </div>
  );
}

/**
 * The core loop, reinterpreted as a horizontal scroll-pan instead of a
 * pinned vertical crossfade: motivated by the same idea a filmstrip is,
 * walking through five ordered stages reads better as a sequence you pan
 * through than as cards fading in place. Desktop-and-motion-ok only, per
 * gsap-scrolltrigger's canonical horizontal-pan skeleton; everyone else
 * (mobile, or prefers-reduced-motion at any width) gets the same five
 * stages as a plain vertical stack, no scroll-hijack.
 */
export function HowItWorksLoop() {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(`${MOTION_QUERIES.full} and ${MOTION_QUERIES.desktop}`, () => {
        if (!wrap.current || !track.current) return;
        const distance = track.current.scrollWidth - window.innerWidth;
        const tween = gsap.to(track.current, {
          x: -distance,
          ease: "none",
          scrollTrigger: {
            trigger: wrap.current,
            start: "top top",
            end: () => `+=${distance}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
        return () => tween.scrollTrigger?.kill();
      });
    },
    { scope: wrap },
  );

  return (
    <>
      {/* Mobile and reduced-motion fallback: plain vertical stack. */}
      <div className="mx-auto flex max-w-2xl flex-col gap-16 px-6 py-20 lg:motion-safe:hidden">
        {STAGES.map((stage) => (
          <StagePanel key={stage.label} stage={stage} />
        ))}
      </div>

      {/* Desktop, motion-ok: horizontal scroll-pan. */}
      <div ref={wrap} className="relative hidden overflow-hidden lg:motion-safe:block">
        <div ref={track} className="flex h-[100dvh] items-center gap-20 pl-[8vw]">
          {STAGES.map((stage) => (
            <StagePanel key={stage.label} stage={stage} className="w-[min(60vw,880px)] shrink-0" />
          ))}
          <div className="w-[4vw] shrink-0" aria-hidden />
        </div>
      </div>
    </>
  );
}
