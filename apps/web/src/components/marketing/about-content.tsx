"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DURATION, EASE, MOTION_QUERIES, STAGGER } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function AboutContent() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        gsap.from(".about-block", {
          opacity: 0,
          y: 20,
          duration: DURATION.base,
          ease: EASE.out,
          stagger: STAGGER.loose,
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-16 sm:py-20">
      <p className="about-block text-pretty text-xl leading-relaxed text-foreground sm:text-2xl">
        Students end up with scattered material: PDFs, recordings, half-written notes, a YouTube
        video that explained the one thing lecture didn&apos;t. Then there are three separate jobs
        to do by hand: organize it, understand it, and remember it. Most study apps solve one of
        those and stop.
      </p>

      <p className="about-block text-pretty leading-relaxed text-muted-foreground">
        AIDA&apos;s bet is that doing all three in one connected loop, using material a student
        already has as the source of truth, is worth more than any one piece alone. Upload
        something once, and the notes, the tutor, the quiz, and the review schedule all draw from
        that same material, not from a generic answer pulled off the web.
      </p>

      <p className="about-block text-pretty leading-relaxed text-muted-foreground">
        It isn&apos;t tied to one country&apos;s curriculum or exam board. A university student
        cramming for finals, a high schooler catching up, someone self-studying for a
        certification, all get the same loop. Because it&apos;s general-purpose, a lot of the
        people using it are under 18, some under 13. That shaped the account rules and data
        handling from the first line of code, not as a policy added before launch.{" "}
        <Link href="/trust" className="text-brand-600 transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-400">
          More on that here.
        </Link>
      </p>

      <p className="about-block text-pretty leading-relaxed text-muted-foreground">
        There&apos;s no leaderboard, no group chat, no social feed here, on purpose. Those are real
        features for a different bet: that studying gets better with an audience. This one is
        about whether the loop itself, done well, is enough before anything gets added around the
        edges of it.
      </p>
    </div>
  );
}
