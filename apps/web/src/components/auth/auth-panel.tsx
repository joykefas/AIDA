"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Lightbulb, PencilLine, CalendarClock } from "lucide-react";
import { DURATION, EASE, MOTION_QUERIES } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

const PROOF_CARDS = [
  { icon: Lightbulb, label: "Generated from your notes", detail: "Mind map · 12 nodes" },
  { icon: PencilLine, label: "Written response, graded", detail: "87% · strong on definitions" },
  { icon: CalendarClock, label: "Next review", detail: "Cell biology · tomorrow" },
] as const;

// Constant speed rather than a fixed duration, so the loop still feels
// right if a card is ever added or removed from the list above.
const MARQUEE_PX_PER_SECOND = 22;

/**
 * Left-hand brand panel for the auth flow. Purely decorative, so unlike
 * the marketing hero's CTAs, every element here is safe to include in the
 * GSAP timeline.
 */
export function AuthPanel() {
  const root = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES.full, () => {
        gsap.from(".auth-panel-heading", {
          opacity: 0,
          y: 20,
          duration: DURATION.base,
          ease: EASE.out,
        });
        gsap.from(".auth-proof-track", {
          opacity: 0,
          duration: DURATION.base,
          ease: EASE.out,
          delay: 0.15,
        });

        const track = trackRef.current;
        if (!track) return;
        // The track renders the card list twice back to back, so scrolling
        // exactly one set's height loops seamlessly into the duplicate.
        const loopDistance = track.scrollHeight / 2;
        const tween = gsap.to(track, {
          y: -loopDistance,
          duration: loopDistance / MARQUEE_PX_PER_SECOND,
          ease: "none",
          repeat: -1,
        });
        return () => tween.kill();
      });

      mm.add(MOTION_QUERIES.reduced, () => {
        gsap.set([".auth-panel-heading", ".auth-proof-track"], { opacity: 1, y: 0 });
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="relative hidden overflow-hidden bg-brand-950 px-12 py-12 lg:flex lg:flex-col lg:justify-between"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_15%_0%,var(--brand-700)_0%,transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(60%_60%_at_85%_100%,var(--brand-600)_0%,transparent_65%)] opacity-60"
      />

      <Link href="/" className="relative z-10 w-fit transition-opacity hover:opacity-80">
        <Image
          src="/brand/dark_logo.png"
          alt="AIDA"
          width={2000}
          height={2000}
          className="h-24 w-24 mix-blend-screen"
        />
      </Link>

      <div className="relative z-10">
        <p className="auth-panel-heading max-w-sm text-balance font-heading text-3xl font-semibold leading-[1.15] tracking-tight text-white">
          Every upload becomes a tutor, a quiz, and a schedule that won&apos;t let you forget.
        </p>

        <div className="mt-10 h-56 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
          <div ref={trackRef} className="auth-proof-track flex flex-col gap-3">
            {[...PROOF_CARDS, ...PROOF_CARDS].map(({ icon: Icon, label, detail }, i) => (
              <div
                key={i}
                className="flex w-fit shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-white/60">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
