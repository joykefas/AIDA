"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Expand,
  Shrink,
  Search,
  X,
  FileText,
  Compass,
  ArrowRight,
  Move,
} from "lucide-react";
import { cn } from "cn";
import type { MindMapData, MindMapNode } from "@aida/shared";
import { Button } from "@/components/ui/button";

// ─── Theme & Branch Palettes ──────────────────────────────────────────────────

interface BranchPalette {
  name: string;
  color: string;
  glow: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  dot: string;
  badgeBg: string;
  badgeText: string;
}

const BRANCH_PALETTES: BranchPalette[] = [
  {
    name: "emerald",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.35)",
    pillBg: "bg-emerald-500/10 dark:bg-emerald-950/30",
    pillBorder: "border-emerald-500/40 dark:border-emerald-500/60",
    pillText: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-500",
    badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    badgeText: "text-emerald-700 dark:text-emerald-300",
  },
  {
    name: "blue",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.35)",
    pillBg: "bg-blue-500/10 dark:bg-blue-950/30",
    pillBorder: "border-blue-500/40 dark:border-blue-500/60",
    pillText: "text-blue-800 dark:text-blue-200",
    dot: "bg-blue-500",
    badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
  {
    name: "purple",
    color: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.35)",
    pillBg: "bg-purple-500/10 dark:bg-purple-950/30",
    pillBorder: "border-purple-500/40 dark:border-purple-500/60",
    pillText: "text-purple-800 dark:text-purple-200",
    dot: "bg-purple-500",
    badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    badgeText: "text-purple-700 dark:text-purple-300",
  },
  {
    name: "amber",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.35)",
    pillBg: "bg-amber-500/10 dark:bg-amber-950/30",
    pillBorder: "border-amber-500/40 dark:border-amber-500/60",
    pillText: "text-amber-800 dark:text-amber-200",
    dot: "bg-amber-500",
    badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  {
    name: "rose",
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.35)",
    pillBg: "bg-rose-500/10 dark:bg-rose-950/30",
    pillBorder: "border-rose-500/40 dark:border-rose-500/60",
    pillText: "text-rose-800 dark:text-rose-200",
    dot: "bg-rose-500",
    badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    badgeText: "text-rose-700 dark:text-rose-300",
  },
  {
    name: "cyan",
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.35)",
    pillBg: "bg-cyan-500/10 dark:bg-cyan-950/30",
    pillBorder: "border-cyan-500/40 dark:border-cyan-500/60",
    pillText: "text-cyan-800 dark:text-cyan-200",
    dot: "bg-cyan-500",
    badgeBg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    badgeText: "text-cyan-700 dark:text-cyan-300",
  },
];

// ─── Layout Geometry Types ────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  label: string;
  noteAnchor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  isRoot: boolean;
  side: "root" | "left" | "right";
  palette: BranchPalette;
  parentId?: string;
}

interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  color: string;
  path: string;
  side: "left" | "right";
}

// ─── Hierarchy & Bipartite Tree Layout Calculator ─────────────────────────────

const ROOT_WIDTH = 240;
const ROOT_HEIGHT = 72;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
const HORIZONTAL_GAP = 90;
const VERTICAL_SPACING = 90;

function computeMindMapLayout(data: MindMapData): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
} {
  if (!data.nodes || data.nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: -200, maxX: 200, minY: -150, maxY: 150 },
    };
  }

  const nodeMap = new Map<string, MindMapNode>(data.nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  data.nodes.forEach((n) => {
    adjacency.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  data.edges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      adjacency.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // Identify root candidate
  let rootId = data.nodes[0].id;
  for (const n of data.nodes) {
    if (inDegree.get(n.id) === 0 && (adjacency.get(n.id)?.length || 0) > 0) {
      rootId = n.id;
      break;
    }
  }

  const rootRaw = nodeMap.get(rootId)!;
  const visited = new Set<string>([rootId]);

  // Primary branch children of root
  const directChildren = (adjacency.get(rootId) || []).filter((id) => !visited.has(id));
  directChildren.forEach((id) => visited.add(id));

  // If any unvisited nodes remain in data, attach them to root direct children so nothing is lost
  data.nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      directChildren.push(n.id);
      visited.add(n.id);
    }
  });

  // Split primary branches into Right and Left sets
  const rightBranches: string[] = [];
  const leftBranches: string[] = [];
  directChildren.forEach((childId, idx) => {
    if (idx % 2 === 0) {
      rightBranches.push(childId);
    } else {
      leftBranches.push(childId);
    }
  });

  // Helper to build subtrees recursively
  interface TreeNode {
    id: string;
    level: number;
    children: TreeNode[];
    branchIndex: number;
    height: number;
  }

  function buildSubtree(id: string, level: number, branchIdx: number): TreeNode {
    const rawChildren = (adjacency.get(id) || []).filter((childId) => !visited.has(childId));
    rawChildren.forEach((childId) => visited.add(childId));
    const children = rawChildren.map((childId) => buildSubtree(childId, level + 1, branchIdx));
    const childrenHeight = children.reduce((acc, c) => acc + c.height, 0);
    const height = Math.max(VERTICAL_SPACING, childrenHeight);
    return { id, level, children, branchIndex: branchIdx, height };
  }

  // Pre-mark all sub-branches
  const rightTrees: TreeNode[] = rightBranches.map((id, i) => buildSubtree(id, 1, i * 2));
  const leftTrees: TreeNode[] = leftBranches.map((id, i) => buildSubtree(id, 1, i * 2 + 1));

  const positionedNodes: LayoutNode[] = [];
  const parentMap = new Map<string, string>();

  // Add Root
  const rootNode: LayoutNode = {
    id: rootRaw.id,
    label: rootRaw.label,
    noteAnchor: rootRaw.noteAnchor,
    x: 0,
    y: 0,
    width: ROOT_WIDTH,
    height: ROOT_HEIGHT,
    level: 0,
    isRoot: true,
    side: "root",
    palette: {
      name: "brand",
      color: "var(--brand-600)",
      glow: "rgba(59, 130, 246, 0.45)",
      pillBg: "bg-brand-600 dark:bg-brand-500",
      pillBorder: "border-brand-400 dark:border-brand-400",
      pillText: "text-white",
      dot: "bg-white",
      badgeBg: "bg-white/20 text-white",
      badgeText: "text-white",
    },
  };
  positionedNodes.push(rootNode);

  // Position a side (Right or Left)
  function layoutSide(trees: TreeNode[], side: "right" | "left") {
    const totalHeight = trees.reduce((acc, t) => acc + t.height, 0);
    let currentY = -totalHeight / 2;
    const sign = side === "right" ? 1 : -1;

    function layoutTree(tree: TreeNode, depth: number, yTop: number) {
      const nodeX = sign * (ROOT_WIDTH / 2 + HORIZONTAL_GAP + NODE_WIDTH / 2 + (depth - 1) * (NODE_WIDTH + HORIZONTAL_GAP));
      const nodeY = yTop + tree.height / 2;
      const raw = nodeMap.get(tree.id)!;
      const palette = BRANCH_PALETTES[tree.branchIndex % BRANCH_PALETTES.length];

      positionedNodes.push({
        id: tree.id,
        label: raw.label,
        noteAnchor: raw.noteAnchor,
        x: nodeX,
        y: nodeY,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        level: tree.level,
        isRoot: false,
        side,
        palette,
        parentId: parentMap.get(tree.id),
      });

      let childYTop = yTop;
      tree.children.forEach((child) => {
        parentMap.set(child.id, tree.id);
        layoutTree(child, depth + 1, childYTop);
        childYTop += child.height;
      });
    }

    trees.forEach((t) => {
      parentMap.set(t.id, rootId);
      layoutTree(t, 1, currentY);
      currentY += t.height;
    });
  }

  layoutSide(rightTrees, "right");
  layoutSide(leftTrees, "left");

  // Build connecting curves for all edges
  const layoutNodeMap = new Map<string, LayoutNode>(positionedNodes.map((n) => [n.id, n]));
  const layoutEdges: LayoutEdge[] = [];

  function makeBezierPath(source: LayoutNode, target: LayoutNode): { path: string; side: "left" | "right" } {
    const isTargetRight = target.x >= source.x;
    const startX = isTargetRight ? source.x + source.width / 2 : source.x - source.width / 2;
    const startY = source.y;
    const endX = isTargetRight ? target.x - target.width / 2 : target.x + target.width / 2;
    const endY = target.y;

    const dx = Math.abs(endX - startX);
    const curveOffset = Math.max(30, dx * 0.5);

    const cp1x = isTargetRight ? startX + curveOffset : startX - curveOffset;
    const cp1y = startY;
    const cp2x = isTargetRight ? endX - curveOffset : endX + curveOffset;
    const cp2y = endY;

    return {
      path: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
      side: isTargetRight ? "right" : "left",
    };
  }

  data.edges.forEach((edge, idx) => {
    const source = layoutNodeMap.get(edge.source);
    const target = layoutNodeMap.get(edge.target);
    if (!source || !target) return;

    const { path, side } = makeBezierPath(source, target);
    const color = target.isRoot ? source.palette.color : target.palette.color;

    layoutEdges.push({
      id: `${edge.source}-${edge.target}-${idx}`,
      sourceId: edge.source,
      targetId: edge.target,
      color,
      path,
      side,
    });
  });

  // Compute bounds
  let minX = -300;
  let maxX = 300;
  let minY = -200;
  let maxY = 200;

  positionedNodes.forEach((n) => {
    minX = Math.min(minX, n.x - n.width / 2 - 40);
    maxX = Math.max(maxX, n.x + n.width / 2 + 40);
    minY = Math.min(minY, n.y - n.height / 2 - 40);
    maxY = Math.max(maxY, n.y + n.height / 2 + 40);
  });

  return {
    nodes: positionedNodes,
    edges: layoutEdges,
    bounds: { minX, maxX, minY, maxY },
  };
}

// ─── MindMap Component ────────────────────────────────────────────────────────

export function MindMap({
  data,
  onNodeSelect,
  className,
}: {
  data: MindMapData;
  onNodeSelect?: (anchor: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const patternId = useId();

  // Layout calculations
  const layout = useMemo(() => computeMindMapLayout(data), [data]);

  // Pan, Zoom & Viewport
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Custom node position offsets from dragging
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const draggingNodeRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Interactivity state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper to fit entire mind map into view
  const fitToView = useCallback(() => {
    if (!containerRef.current || layout.nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { minX, maxX, minY, maxY } = layout.bounds;
    const contentW = Math.max(maxX - minX + 100, 300);
    const contentH = Math.max(maxY - minY + 100, 200);

    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const newZoom = Math.min(1.2, Math.max(0.45, Math.min(scaleX, scaleY) * 0.9));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: -centerX * newZoom,
      y: -centerY * newZoom,
    });
  }, [layout.bounds, layout.nodes.length]);

  // Initial fit on load or data change
  useEffect(() => {
    const timer = setTimeout(() => fitToView(), 50);
    return () => clearTimeout(timer);
  }, [fitToView, isFullscreen]);

  // Escape key for fullscreen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Canvas pan handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only

    // Ignore any click inside an interactive control or overlay element
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        "button, input, textarea, a, select, [data-no-pan], [data-overlay], [role='button']",
      )
    ) {
      return;
    }

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Check if dragging a specific node
    if (draggingNodeRef.current) {
      const drag = draggingNodeRef.current;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      if (Math.hypot(dx, dy) > 2) {
        setDragOffsets((prev) => ({
          ...prev,
          [drag.id]: { x: drag.origX + dx, y: drag.origY + dy },
        }));
      }
      return;
    }

    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingNodeRef.current) {
      draggingNodeRef.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Wheel zoom centered on pointer
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(2.2, Math.max(0.35, zoom * zoomFactor));
    const scaleChange = newZoom / zoom;

    setZoom(newZoom);
    setPan((p) => ({
      x: mouseX - (mouseX - p.x) * scaleChange,
      y: mouseY - (mouseY - p.y) * scaleChange,
    }));
  };

  // Zoom button triggers
  const zoomIn = () => setZoom((z) => Math.min(2.2, z * 1.2));
  const zoomOut = () => setZoom((z) => Math.max(0.35, z / 1.2));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const resetNodePositions = () => setDragOffsets({});

  // Node drag start handler
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const currentOffset = dragOffsets[nodeId] || { x: 0, y: 0 };
    draggingNodeRef.current = {
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentOffset.x,
      origY: currentOffset.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe ignore
    }
  };

  const handleNodePointerUp = (e: React.PointerEvent, nodeId: string) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Safe ignore
    }
    if (draggingNodeRef.current?.id === nodeId) {
      draggingNodeRef.current = null;
    }
  };

  // Search filter matches
  const searchFilter = searchQuery.trim().toLowerCase();
  const isNodeMatched = useCallback(
    (label: string) => {
      if (!searchFilter) return true;
      return label.toLowerCase().includes(searchFilter);
    },
    [searchFilter],
  );

  // Active highlighted ancestry path
  const highlightedAncestors = useMemo(() => {
    const targetId = hoveredNodeId || selectedNodeId;
    if (!targetId) return new Set<string>();
    const ancestors = new Set<string>([targetId]);
    const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));

    let curr = nodeMap.get(targetId);
    while (curr?.parentId) {
      ancestors.add(curr.parentId);
      curr = nodeMap.get(curr.parentId);
    }
    return ancestors;
  }, [hoveredNodeId, selectedNodeId, layout.nodes]);

  // Selected node details
  const selectedNode = useMemo(
    () => layout.nodes.find((n) => n.id === selectedNodeId),
    [selectedNodeId, layout.nodes],
  );

  // Compute live positions with drag offsets
  const nodesWithPositions = useMemo(() => {
    return layout.nodes.map((n) => {
      const offset = dragOffsets[n.id] || { x: 0, y: 0 };
      return {
        ...n,
        x: n.x + offset.x,
        y: n.y + offset.y,
      };
    });
  }, [layout.nodes, dragOffsets]);

  const liveNodeMap = useMemo(() => {
    return new Map<string, LayoutNode>(nodesWithPositions.map((n) => [n.id, n]));
  }, [nodesWithPositions]);

  // Recompute live bezier curves
  const liveEdges = useMemo(() => {
    return layout.edges.map((e) => {
      const source = liveNodeMap.get(e.sourceId);
      const target = liveNodeMap.get(e.targetId);
      if (!source || !target) return e;

      const isTargetRight = target.x >= source.x;
      const startX = isTargetRight ? source.x + source.width / 2 : source.x - source.width / 2;
      const startY = source.y;
      const endX = isTargetRight ? target.x - target.width / 2 : target.x + target.width / 2;
      const endY = target.y;

      const dx = Math.abs(endX - startX);
      const curveOffset = Math.max(30, dx * 0.5);
      const cp1x = isTargetRight ? startX + curveOffset : startX - curveOffset;
      const cp1y = startY;
      const cp2x = isTargetRight ? endX - curveOffset : endX + curveOffset;
      const cp2y = endY;

      return {
        ...e,
        path: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
      };
    });
  }, [layout.edges, liveNodeMap]);

  if (layout.nodes.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Compass className="size-8 opacity-40" />
        <p>No mind map generated for this topic yet.</p>
      </div>
    );
  }

  const containerContent = (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      className={cn(
        "relative select-none overflow-hidden rounded-2xl border border-border bg-slate-950 font-sans text-foreground transition-colors",
        isFullscreen ? "h-full w-full rounded-none border-0" : "h-[580px] w-full",
        isPanning ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{ touchAction: "none" }}
    >
      {/* ── Background Dot Grid Pattern ── */}
      <svg className="pointer-events-none absolute inset-0 size-full opacity-40">
        <defs>
          <pattern
            id={patternId}
            width={24 * zoom}
            height={24 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y})`}
          >
            <circle cx={1.5} cy={1.5} r={1.2} className="fill-slate-600 dark:fill-slate-500" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* ── Top Bar Overlay: Info & Search ── */}
      <div
        data-overlay="true"
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2"
      >
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur-md">
          <span className="size-2 animate-pulse rounded-full bg-brand-500" />
          <span className="text-xs font-medium text-foreground">Interactive Mind Map</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">• {layout.nodes.length} nodes</span>
        </div>

        {/* Quick search */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search concepts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-8 w-36 select-text cursor-text rounded-xl border border-border/80 bg-background/90 pl-8 pr-7 text-xs outline-none transition-all placeholder:text-muted-foreground focus:w-48 focus:border-brand-500/70 focus:bg-background focus:ring-2 focus:ring-brand-500/20 sm:w-44"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Top Right: Fullscreen / Close ── */}
      <div
        data-overlay="true"
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute right-4 top-4 z-20 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
          className="flex size-8 items-center justify-center rounded-xl border border-border/80 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-md transition hover:bg-accent hover:text-foreground active:scale-95 cursor-pointer"
        >
          {isFullscreen ? <Shrink className="size-4" /> : <Expand className="size-4" />}
        </button>
      </div>

      {/* ── Transformable Canvas (Pan & Zoom) ── */}
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          willChange: "transform",
        }}
      >
        {/* ── Connecting SVG Curves ── */}
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
        >
          <defs>
            <filter id="glow-edge" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="currentColor" floodOpacity="0.4" />
            </filter>
          </defs>

          {liveEdges.map((edge) => {
            const isHighlighted =
              highlightedAncestors.has(edge.sourceId) && highlightedAncestors.has(edge.targetId);
            const isDimmed =
              (hoveredNodeId || selectedNodeId) && !isHighlighted;

            return (
              <path
                key={edge.id}
                d={edge.path}
                fill="none"
                stroke={edge.color}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeOpacity={isDimmed ? 0.2 : isHighlighted ? 0.95 : 0.65}
                strokeLinecap="round"
                className="transition-all duration-200"
                style={{
                  filter: isHighlighted ? `drop-shadow(0 0 6px ${edge.color})` : undefined,
                }}
              />
            );
          })}
        </svg>

        {/* ── Interactive Mind Map Nodes ── */}
        {nodesWithPositions.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isHighlighted = highlightedAncestors.has(node.id);
          const isMatched = isNodeMatched(node.label);
          const isDimmed =
            (!isMatched && searchFilter.length > 0) ||
            ((hoveredNodeId || selectedNodeId) && !isHighlighted);

          if (node.isRoot) {
            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                onPointerUp={(e) => handleNodePointerUp(e, node.id)}
                onClick={() => setSelectedNodeId(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`,
                }}
                className={cn(
                  "group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none rounded-2xl border-2 p-3.5 text-center shadow-lg transition-all duration-200 active:scale-95",
                  "border-brand-400 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 text-white shadow-brand-600/30 ring-4 ring-brand-500/20 hover:shadow-xl hover:shadow-brand-500/40",
                  isSelected && "ring-brand-400 ring-offset-2 ring-offset-background",
                  isDimmed && "opacity-35 grayscale",
                )}
              >
                <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-wider text-brand-200 uppercase">
                  <span className="size-1.5 rounded-full bg-white animate-ping" />
                  Central Topic
                </div>
                <div className="font-heading text-sm font-bold tracking-tight text-white sm:text-base">
                  {node.label}
                </div>
              </div>
            );
          }

          // Sub-nodes & Leaves
          const palette = node.palette;

          return (
            <div
              key={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerUp={(e) => handleNodePointerUp(e, node.id)}
              onClick={() => setSelectedNodeId(node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                minHeight: `${node.height}px`,
                borderColor: isSelected || isHovered ? palette.color : undefined,
              }}
              className={cn(
                "group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none rounded-2xl border bg-card/95 p-3 text-left shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-[calc(50%+2px)] hover:shadow-md active:scale-95",
                "border-border/80 text-foreground",
                isSelected && "ring-2 ring-offset-2 ring-offset-background shadow-md",
                isHighlighted && "border-opacity-100 shadow-md",
                isDimmed && "opacity-30",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", palette.dot)} />
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider", palette.pillText)}>
                    {node.level === 1 ? "Core Concept" : "Subtopic"}
                  </span>
                </div>
                <Move className="size-3 text-muted-foreground/40 transition group-hover:text-muted-foreground" />
              </div>
              <div className="text-xs leading-snug font-medium text-foreground">
                {node.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Left Help Prompt ── */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
        <span className="rounded-lg bg-background/80 px-2.5 py-1 backdrop-blur-md">
          Drag background to pan • Scroll to zoom • Drag cards to rearrange
        </span>
      </div>

      {/* ── Bottom Right Controls Toolbar ── */}
      <div
        data-overlay="true"
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-2xl border border-border/80 bg-background/90 p-1 shadow-lg backdrop-blur-md"
      >
        <button
          type="button"
          onClick={zoomOut}
          title="Zoom Out"
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-90 cursor-pointer"
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          title="Reset Zoom to 100%"
          className="min-w-11 px-1 text-center font-mono text-xs font-medium text-foreground transition hover:text-brand-500 cursor-pointer"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          title="Zoom In"
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-90 cursor-pointer"
        >
          <ZoomIn className="size-4" />
        </button>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={fitToView}
          title="Fit Mind Map to View"
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-90 cursor-pointer"
        >
          <Maximize2 className="size-4" />
        </button>
        {Object.keys(dragOffsets).length > 0 && (
          <button
            type="button"
            onClick={resetNodePositions}
            title="Reset Custom Card Positions"
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-90 cursor-pointer"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>

      {/* ── Node Detail / Action Popover (when node selected) ── */}
      {selectedNode && (
        <div
          data-overlay="true"
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute bottom-16 left-4 z-30 flex max-w-sm select-text flex-col gap-2 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md sm:left-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", selectedNode.palette.dot)} />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                {selectedNode.isRoot ? "Central Topic" : "Concept Card"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="text-muted-foreground transition hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="font-heading text-sm font-semibold text-foreground select-text cursor-text">
            {selectedNode.label}
          </p>
          {onNodeSelect && selectedNode.noteAnchor && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                onNodeSelect(selectedNode.noteAnchor);
                setSelectedNodeId(null);
                if (isFullscreen) setIsFullscreen(false);
              }}
              className="mt-1 flex items-center justify-between text-xs cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5" /> Jump to Notes
              </span>
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // If fullscreen, render inside a portal-like fixed backdrop
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl p-3 sm:p-5">
        <div className="mb-2 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-semibold text-foreground">Study Mind Map</span>
            <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
              Fullscreen Mode
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Shrink className="size-3.5" /> Exit Fullscreen (Esc)
          </Button>
        </div>
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-border">
          {containerContent}
        </div>
      </div>
    );
  }

  return containerContent;
}
