"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Upload, Lightbulb, PencilLine, CalendarClock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FloatingIcons } from "@/components/marketing/floating-icons";
import { cn } from "cn";
import { DURATION, EASE, MOTION_QUERIES } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CTA_ICONS = [
  { icon: Upload, position: "top-[14%] left-[10%]", size: "lg" as const },
  { icon: Lightbulb, position: "top-[20%] right-[12%]", size: "md" as const },
  { icon: PencilLine, position: "bottom-[18%] left-[14%]", size: "md" as const },
  { icon: CalendarClock, position: "bottom-[14%] right-[9%]", size: "lg" as const },
];

export function FinalCta() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        // Animates the heading and body copy only, not the CTA link itself —
        // GSAP-animating an <a>/Link element in this stagger-from-ScrollTrigger
        // shape reliably left it stuck at its "from" opacity (same issue as
        // the hero CTAs). Not worth the debugging cost; the button just
        // renders at its natural, always-visible state.
        gsap.from(".cta-content h2, .cta-content p", {
          opacity: 0,
          y: 20,
          duration: DURATION.base,
          ease: EASE.out,
          stagger: 0.08,
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="px-6 py-8">
      <div className="cta-content relative isolate mx-auto flex max-w-2xl flex-col items-center gap-6 overflow-hidden rounded-3xl bg-brand-600 px-8 py-16 text-center text-white">
        <FloatingIcons icons={CTA_ICONS} variant="ghost" className="hidden sm:block" />
        <h2 className="relative text-balance font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Your next upload could be the last time you study this the hard way
        </h2>
        <p className="max-w-md text-brand-50">
          Free to start. No credit card. Your first set of notes is a few minutes away.
        </p>
        <Link
          href="/register"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 bg-white px-6 text-base text-brand-700 hover:bg-brand-50",
          )}
        >
          Start studying free
        </Link>
      </div>
    </section>
  );
}
