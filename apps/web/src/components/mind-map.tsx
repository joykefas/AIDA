"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "cn";
import type { MindMapData } from "@aida/shared";
import { DURATION, EASE, MOTION_QUERIES, STAGGER } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

const BRANCH_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

interface Positioned {
  id: string;
  label: string;
  noteAnchor: string;
  x: number;
  y: number;
  isRoot: boolean;
  color: string;
}

function layout(data: MindMapData): Positioned[] {
  if (data.nodes.length === 0) return [];
  const root = data.nodes[0];
  const children = data.nodes.slice(1);
  const radius = 38;
  const positions: Positioned[] = [
    { ...root, x: 50, y: 50, isRoot: true, color: "var(--brand-600)" },
  ];
  const n = Math.max(children.length, 1);
  children.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    positions.push({
      ...node,
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle) * 0.75,
      isRoot: false,
      color: BRANCH_COLORS[i % BRANCH_COLORS.length],
    });
  });
  return positions;
}

/** A gentle outward-bowing quadratic curve instead of a straight line,
 * pulled away from the canvas center — reads as an organic mind-map branch
 * rather than a wiring diagram. */
function curvePath(source: Positioned, target: Positioned) {
  const mx = (source.x + target.x) / 2;
  const my = (source.y + target.y) / 2;
  const dx = mx - 50;
  const dy = my - 50;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const bow = 6;
  const cx = mx + (dx / dist) * bow;
  const cy = my + (dy / dist) * bow;
  return `M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`;
}

export function MindMap({
  data,
  onNodeSelect,
}: {
  data: MindMapData;
  onNodeSelect?: (anchor: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const positions = useMemo(() => layout(data), [data]);
  const byId = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.full, () => {
        gsap.from(".mm-node", {
          opacity: 0,
          scale: 0.6,
          duration: DURATION.base,
          ease: EASE.snap,
          stagger: STAGGER.base,
        });
        gsap.from(".mm-edge", {
          opacity: 0,
          duration: DURATION.slow,
          ease: EASE.out,
          stagger: STAGGER.tight,
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [positions.length] },
  );

  if (positions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        No mind map yet.
      </div>
    );
  }

  return (
    <div
      ref={root}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-[radial-gradient(60%_60%_at_50%_50%,var(--brand-50)_0%,transparent_70%)] bg-card dark:bg-[radial-gradient(60%_60%_at_50%_50%,var(--brand-950)_0%,transparent_70%)] sm:aspect-[16/9]"
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="mm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {data.edges.map((edge, i) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return null;
          const highlighted = active === edge.source || active === edge.target;
          const branchColor = source.isRoot ? target.color : source.color;
          return (
            <path
              key={i}
              className="mm-edge transition-[stroke-width,opacity] duration-200"
              d={curvePath(source, target)}
              fill="none"
              stroke={branchColor}
              strokeOpacity={highlighted ? 0.9 : 0.35}
              strokeWidth={highlighted ? 2.2 : 1.3}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              filter={highlighted ? "url(#mm-glow)" : undefined}
            />
          );
        })}
      </svg>

      {positions.map((node) => (
        <button
          key={node.id}
          type="button"
          onMouseEnter={() => setActive(node.id)}
          onMouseLeave={() => setActive(null)}
          onFocus={() => setActive(node.id)}
          onBlur={() => setActive(null)}
          onClick={() => onNodeSelect?.(node.noteAnchor)}
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            ...(node.isRoot ? {} : { borderColor: active === node.id ? node.color : undefined }),
          }}
          className={cn(
            "mm-node absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border text-center text-xs font-medium shadow-sm transition-all hover:scale-105 hover:shadow-md focus-visible:scale-105 focus-visible:outline-none",
            node.isRoot
              ? "max-w-[9.5rem] border-transparent bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-2.5 text-white shadow-lg shadow-brand-600/25 ring-4 ring-brand-600/10 sm:text-sm"
              : "max-w-[7.5rem] border-border bg-card px-3 py-2 text-foreground",
          )}
        >
          {!node.isRoot && (
            <span
              aria-hidden
              className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
              style={{ backgroundColor: node.color }}
            />
          )}
          {node.label}
        </button>
      ))}
    </div>
  );
}
