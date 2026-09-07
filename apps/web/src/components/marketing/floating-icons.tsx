"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { LucideIcon } from "lucide-react";
import { MOTION_QUERIES } from "@/lib/motion";
import { cn } from "cn";

gsap.registerPlugin(useGSAP);

export interface FloatingIconSpec {
  icon: LucideIcon;
  /** Tailwind positioning classes, e.g. "top-16 left-[8%]". */
  position: string;
  size?: "sm" | "md" | "lg";
  rotate?: string;
}

const SIZE_CLASS = {
  sm: "size-9 [&_svg]:size-4",
  md: "size-11 [&_svg]:size-4.5",
  lg: "size-14 [&_svg]:size-6",
} as const;

const VARIANT_CLASS = {
  /** Soft branded chip, for use over plain page backgrounds. */
  chip: "rounded-2xl border border-brand-200/60 bg-brand-50/80 text-brand-600 shadow-sm backdrop-blur-sm dark:border-brand-800/50 dark:bg-brand-950/60 dark:text-brand-300",
  /** Bare, faint glyph with no container, for use over a solid brand-colored surface. */
  ghost: "text-white/15",
} as const;

/**
 * Ambient, purely decorative icon field: motivated by the hero's own
 * message (the formats and stages the product actually handles), not
 * random confetti. Floats gently on a continuous loop; sits still under
 * prefers-reduced-motion.
 */
export function FloatingIcons({
  icons,
  className,
  variant = "chip",
}: {
  icons: readonly FloatingIconSpec[];
  className?: string;
  variant?: keyof typeof VARIANT_CLASS;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        gsap.utils.toArray<HTMLElement>(".floating-icon").forEach((el, i) => {
          gsap.to(el, {
            y: i % 2 === 0 ? "+=16" : "-=16",
            duration: 3.5 + (i % 3) * 0.6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.15,
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      {icons.map(({ icon: Icon, position, size = "md", rotate }, i) => (
        <div
          key={i}
          style={rotate ? { rotate } : undefined}
          className={cn(
            "floating-icon absolute flex items-center justify-center",
            VARIANT_CLASS[variant],
            SIZE_CLASS[size],
            position,
          )}
        >
          <Icon />
        </div>
      ))}
    </div>
  );
}
