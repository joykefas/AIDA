"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FileStack, MessagesSquare, ClipboardCheck, Repeat2, Sparkles } from "lucide-react";
import { cn } from "cn";
import { DURATION, EASE, MOTION_QUERIES, STAGGER } from "@/lib/motion";
import { UploadModesPreview, TutorPreview, GradingPreview } from "@/components/marketing/product-previews";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LEAD = {
  icon: FileStack,
  title: "Any format you already have",
  body: "PDF, audio recordings, YouTube links, or typed notes. No re-formatting, no re-typing before AIDA can work with it.",
};

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "A tutor grounded in your material",
    body: "Answers reference the source. If your textbook explains it one way, the tutor does too.",
    preview: TutorPreview,
  },
  {
    icon: ClipboardCheck,
    title: "Grading that explains, not just scores",
    body: "Written responses get a percentage and specific feedback on what to fix, the way a TA would mark it.",
    preview: GradingPreview,
  },
  {
    icon: Repeat2,
    title: "A coach that knows what you'll forget",
    body: "SM-2 spaced repetition resurfaces topics before they fade, and flags anything you've missed twice running.",
    preview: null,
  },
  {
    icon: Sparkles,
    title: "Explained the way you actually learn",
    body: "Diagrams, stories, analogies, formulas, or audio-style, set once at onboarding and applied everywhere.",
    preview: null,
  },
] as const;

export function Features() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        gsap.from(".feature-card", {
          opacity: 0,
          y: 28,
          duration: DURATION.base,
          ease: EASE.out,
          stagger: STAGGER.base,
          scrollTrigger: { trigger: root.current, start: "top 80%" },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="feature-card flex flex-col gap-6 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-background p-7 dark:border-brand-800 dark:from-brand-950 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
              <LEAD.icon className="size-6" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold">{LEAD.title}</h3>
              <p className="mt-1.5 max-w-md text-muted-foreground">{LEAD.body}</p>
            </div>
          </div>
          <div className="w-full max-w-xs shrink-0">
            <UploadModesPreview />
          </div>
        </div>

        {FEATURES.map(({ icon: Icon, title, body, preview: Preview }) => (
          <div
            key={title}
            className={cn(
              "feature-card flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-300 dark:hover:border-brand-700",
            )}
          >
            <div>
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                <Icon className="size-5" />
              </div>
              <h3 className="font-heading text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
            {Preview && (
              <div className="mt-auto pt-2">
                <Preview />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
