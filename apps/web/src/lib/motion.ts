/**
 * Shared motion vocabulary — durations, eases, and the reduced-motion
 * matchMedia breakpoint every GSAP animation in the app should route through,
 * so timing reads as one system instead of being reinvented per component.
 */

export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  entrance: "expo.out",
  snap: "back.out(1.6)",
} as const;

export const DURATION = {
  fast: 0.35,
  base: 0.6,
  slow: 0.9,
  section: 1.1,
} as const;

export const STAGGER = {
  tight: 0.04,
  base: 0.08,
  loose: 0.14,
} as const;

/** gsap.matchMedia() config: pair with `mm.add(MOTION_QUERIES, (ctx) => {...})`. */
export const MOTION_QUERIES = {
  reduced: "(prefers-reduced-motion: reduce)",
  full: "(prefers-reduced-motion: no-preference)",
  desktop: "(min-width: 1024px)",
  mobile: "(max-width: 1023px)",
} as const;
