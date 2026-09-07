"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, MessagesSquare, ClipboardCheck, Repeat2 } from "lucide-react";
import { DURATION, EASE, MOTION_QUERIES, STAGGER } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HIGHLIGHTS = [
  {
    icon: MessagesSquare,
    title: "A tutor grounded in your material",
    body: "Answers reference the source. If your textbook explains it one way, the tutor does too.",
  },
  {
    icon: ClipboardCheck,
    title: "Grading that explains, not just scores",
    body: "Written responses get a percentage and specific feedback on what to fix.",
  },
  {
    icon: Repeat2,
    title: "A coach that knows what you'll forget",
    body: "Spaced repetition resurfaces topics before they fade, not on a fixed calendar.",
  },
] as const;

export function FeatureHighlight() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        gsap.from(".highlight-card", {
          opacity: 0,
          y: 24,
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

  const [lead, ...rest] = HIGHLIGHTS;
  const LeadIcon = lead.icon;

  return (
    <section ref={root} className="relative isolate mx-auto max-w-6xl px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 -z-10 size-[26rem] rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-950/40"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="highlight-card flex flex-col justify-center rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-background p-8 dark:border-brand-800 dark:from-brand-950">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <LeadIcon className="size-5" />
          </div>
          <h3 className="font-heading text-xl font-semibold">{lead.title}</h3>
          <p className="mt-1.5 max-w-sm text-muted-foreground">{lead.body}</p>
        </div>

        <div className="highlight-card flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
          {rest.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-4 p-6">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                <Icon className="size-4.5" />
              </div>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/features"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:hover:text-brand-400"
        >
          See everything it does
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
