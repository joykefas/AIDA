"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { FileText, Mic, Link2, MessagesSquare, CalendarClock, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FloatingIcons } from "@/components/marketing/floating-icons";
import { EASE, DURATION, MOTION_QUERIES } from "@/lib/motion";
import { cn } from "cn";

gsap.registerPlugin(SplitText, useGSAP);

const HERO_ICONS = [
  { icon: FileText, position: "top-[20%] left-[9%]", size: "lg", rotate: "-8deg" },
  { icon: Mic, position: "top-[16%] right-[11%]", size: "md", rotate: "6deg" },
  { icon: Link2, position: "top-[52%] left-[16%]", size: "sm", rotate: "10deg" },
  { icon: MessagesSquare, position: "top-[48%] right-[7%]", size: "lg", rotate: "-6deg" },
  { icon: CalendarClock, position: "bottom-[18%] left-[8%]", size: "md", rotate: "8deg" },
  { icon: Sparkles, position: "bottom-[22%] right-[15%]", size: "sm", rotate: "-10deg" },
] as const;

export function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES.full, () => {
        const split = new SplitText(".hero-headline", { type: "words", mask: "words" });
        const tl = gsap.timeline({ defaults: { ease: EASE.entrance } });

        // CTA buttons are intentionally left out of this timeline — chaining
        // them here left them permanently stuck at their "from" state
        // (opacity:0) in every environment tested (dev, production, with
        // and without SplitText, with and without stagger or a relative
        // position offset). Not worth the remaining debugging cost for a
        // hero entrance; they render at their natural, always-visible state.
        tl.from(".hero-mark", { opacity: 0, y: 24, scale: 0.9, duration: DURATION.base })
          .from(
            split.words,
            { yPercent: 120, opacity: 0, duration: DURATION.base, stagger: 0.08 },
            "-=0.3",
          )
          .from(".hero-sub", { opacity: 0, y: 16, duration: DURATION.base }, "-=0.35");

        return () => split.revert();
      });

      mm.add(MOTION_QUERIES.reduced, () => {
        gsap.set([".hero-mark", ".hero-headline", ".hero-sub"], { opacity: 1, y: 0, scale: 1 });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative isolate flex min-h-svh flex-col items-center justify-center px-6 pt-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70svh] bg-[radial-gradient(60%_50%_at_50%_0%,var(--brand-100)_0%,transparent_70%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,var(--brand-950)_0%,transparent_70%)]"
      />
      <FloatingIcons icons={HERO_ICONS} className="hidden lg:block" />

      <div className="hero-mark mb-6">
        <Image
          src="/brand/light_logo_single.png"
          alt="AIDA"
          width={64}
          height={64}
          className="size-14 dark:hidden"
          priority
        />
        <Image
          src="/brand/dark_logo_single.png"
          alt="AIDA"
          width={64}
          height={64}
          className="hidden size-14 mix-blend-screen dark:block"
          priority
        />
      </div>

      <h1 className="hero-headline max-w-3xl text-balance font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
        Upload it. Understand it. Never forget it.
      </h1>

      <p className="hero-sub mt-6 max-w-xl text-balance text-lg text-muted-foreground">
        Turn your PDFs, recordings, or notes into a tutor, quizzes, and a schedule for what
        you&apos;re about to forget.
      </p>

      <div className="hero-cta mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}>
          Start studying free
        </Link>
        <Link
          href="/how-it-works"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6 text-base")}
        >
          See how it works
        </Link>
      </div>
    </section>
  );
}
