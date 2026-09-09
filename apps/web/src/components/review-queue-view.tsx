"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  CalendarDays,
  FileText,
  Mic,
  Video,
  Type,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Layers,
  List,
  CheckCircle2,
  TrendingUp,
  Play,
} from "lucide-react";
import { cn } from "cn";
import { ReviewSignal, type ReviewCalendarDay, type ReviewQueueItem } from "@aida/shared";
import { ReviewSignalBadge } from "@/components/review-signal-badge";
import { buttonVariants } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/select";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Clean AI-generated topic titles that prefix the document name or repetitive colons */
function cleanTopicTitle(topicTitle: string, documentTitle: string): string {
  if (!topicTitle) return "Untitled Topic";
  const docLower = documentTitle.toLowerCase().trim();
  const topicLower = topicTitle.toLowerCase().trim();

  if (topicLower.startsWith(docLower + ":")) {
    const stripped = topicTitle.slice(docLower.length + 1).trim();
    return stripped.replace(/^[–—\-\s]+/, "").trim() || topicTitle;
  }

  // Also strip URL prefixes if document title is a URL
  if (topicLower.startsWith("http://") || topicLower.startsWith("https://")) {
    const colonIdx = topicTitle.indexOf(":");
    if (colonIdx !== -1 && colonIdx < 40) {
      const secondColon = topicTitle.indexOf(":", colonIdx + 1);
      if (secondColon !== -1) {
        const afterUrl = topicTitle.slice(secondColon + 1).trim();
        if (afterUrl.length > 5) return afterUrl;
      }
    }
  }

  return topicTitle;
}

/** Detect document format icon from title or properties */
function getDocumentFormatIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes(".pdf") || lower.includes("pdf") || lower.includes("source material")) {
    return { icon: FileText, label: "PDF Document", badgeColor: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
  }
  if (lower.includes("recording") || lower.includes(".webm") || lower.includes(".mp3") || lower.includes("audio")) {
    return { icon: Mic, label: "Audio Note", badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
  }
  if (lower.includes("youtu") || lower.includes("video") || lower.includes("watch?v")) {
    return { icon: Video, label: "YouTube / Video", badgeColor: "text-red-500 bg-red-500/10 border-red-500/20" };
  }
  return { icon: Type, label: "Notes", badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

type SortOption = "urgency" | "mastery_asc" | "mastery_desc" | "alphabetical";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "urgency", label: "Sort by Urgency" },
  { value: "mastery_asc", label: "Lowest Mastery First" },
  { value: "mastery_desc", label: "Highest Mastery First" },
  { value: "alphabetical", label: "Title (A–Z)" },
];

export function ReviewQueueView({
  due,
  calendar,
}: {
  due: ReviewQueueItem[];
  calendar: ReviewCalendarDay[];
}) {
  // Main view tab: "due" or "forecast"
  const [activeTab, setActiveTab] = useState<"due" | "forecast">("due");

  // Due queue controls
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSignal, setFilterSignal] = useState<"all" | "needs_review" | "due" | "low_mastery">("all");
  const [sortBy, setSortBy] = useState<SortOption>("urgency");

  // Collapsed state for document groups in grouped view
  const [collapsedDocs, setCollapsedDocs] = useState<Record<string, boolean>>({});

  // Calendar forecast selected day
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(todayKey());

  // Metrics summary
  const metrics = useMemo(() => {
    const totalDue = due.length;
    const needsReview = due.filter((i) => i.signal === ReviewSignal.NEEDS_REVIEW).length;
    const avgMastery =
      totalDue > 0
        ? Math.round((due.reduce((acc, i) => acc + (i.masteryScore || 0), 0) / totalDue) * 100)
        : 0;
    const uniqueDocs = new Set(due.map((i) => i.documentId)).size;

    return { totalDue, needsReview, avgMastery, uniqueDocs };
  }, [due]);

  // Filtered and sorted queue
  const filteredDue = useMemo(() => {
    let list = [...due];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.topicTitle.toLowerCase().includes(q) ||
          item.documentTitle.toLowerCase().includes(q),
      );
    }

    // Signal / Mastery filters
    if (filterSignal === "needs_review") {
      list = list.filter((i) => i.signal === ReviewSignal.NEEDS_REVIEW);
    } else if (filterSignal === "due") {
      list = list.filter((i) => i.signal === ReviewSignal.DUE);
    } else if (filterSignal === "low_mastery") {
      list = list.filter((i) => (i.masteryScore || 0) < 0.5);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "urgency") {
        if (a.signal === ReviewSignal.NEEDS_REVIEW && b.signal !== ReviewSignal.NEEDS_REVIEW) return -1;
        if (b.signal === ReviewSignal.NEEDS_REVIEW && a.signal !== ReviewSignal.NEEDS_REVIEW) return 1;
        return (a.masteryScore || 0) - (b.masteryScore || 0);
      }
      if (sortBy === "mastery_asc") {
        return (a.masteryScore || 0) - (b.masteryScore || 0);
      }
      if (sortBy === "mastery_desc") {
        return (b.masteryScore || 0) - (a.masteryScore || 0);
      }
      if (sortBy === "alphabetical") {
        return a.topicTitle.localeCompare(b.topicTitle);
      }
      return 0;
    });

    return list;
  }, [due, searchQuery, filterSignal, sortBy]);

  // Group items by document
  const groupedDue = useMemo(() => {
    const map = new Map<
      string,
      {
        documentId: string;
        documentTitle: string;
        items: ReviewQueueItem[];
        avgMastery: number;
        hasUrgent: boolean;
      }
    >();

    filteredDue.forEach((item) => {
      if (!map.has(item.documentId)) {
        map.set(item.documentId, {
          documentId: item.documentId,
          documentTitle: item.documentTitle,
          items: [],
          avgMastery: 0,
          hasUrgent: false,
        });
      }
      const group = map.get(item.documentId)!;
      group.items.push(item);
      if (item.signal === ReviewSignal.NEEDS_REVIEW) {
        group.hasUrgent = true;
      }
    });

    // Compute averages
    map.forEach((group) => {
      const sum = group.items.reduce((acc, i) => acc + (i.masteryScore || 0), 0);
      group.avgMastery = Math.round((sum / group.items.length) * 100);
    });

    return Array.from(map.values());
  }, [filteredDue]);

  const toggleDocCollapse = (docId: string) => {
    setCollapsedDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  // Selected calendar day items
  const activeCalendarDay = useMemo(() => {
    return calendar.find((d) => d.date === selectedCalendarDay) || {
      date: selectedCalendarDay,
      items: [],
    };
  }, [calendar, selectedCalendarDay]);

  // First item to review (for primary CTA button)
  const nextUpItem = due.find((i) => i.signal === ReviewSignal.NEEDS_REVIEW) || due[0];

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header Overview & Metrics Banner ── */}
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Review</h1>
              <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                Spaced Repetition
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              What&apos;s worth revisiting before it fades, and what&apos;s slipping from memory.
            </p>
          </div>

          {nextUpItem && (
            <Link
              href={`/library/${nextUpItem.documentId}`}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "flex items-center gap-2 shadow-md shadow-brand-600/20 active:scale-95",
              )}
            >
              <Play className="size-4 fill-white" />
              <span>Start Review Session</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                {metrics.totalDue} due
              </span>
            </Link>
          )}
        </div>

        {/* Retention Statistics Row */}
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
          <div className="flex flex-col rounded-xl border border-border/80 bg-background/60 p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Due Today</span>
              <Clock className="size-4 text-brand-500" />
            </div>
            <span className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
              {metrics.totalDue}
            </span>
            <span className="text-[11px] text-muted-foreground">Topics ready for recall</span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/80 bg-background/60 p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Slipping / Needs Attention</span>
              <AlertTriangle className="size-4 text-review-500" />
            </div>
            <span className="mt-1 font-heading text-2xl font-bold tracking-tight text-review-600 dark:text-review-400">
              {metrics.needsReview}
            </span>
            <span className="text-[11px] text-muted-foreground">Consecutive low retention</span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/80 bg-background/60 p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Average Mastery</span>
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <span className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
              {metrics.avgMastery}%
            </span>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, metrics.avgMastery))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-border/80 bg-background/60 p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Active Materials</span>
              <Layers className="size-4 text-indigo-500" />
            </div>
            <span className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
              {metrics.uniqueDocs}
            </span>
            <span className="text-[11px] text-muted-foreground">Sources in current queue</span>
          </div>
        </div>
      </div>

      {/* ── Main View Tabs: Queue vs 14-Day Forecast ── */}
      <div className="flex items-center justify-between border-b border-border pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("due")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === "due"
                ? "border-brand-600 text-brand-600 dark:text-brand-400"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Active Queue</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeTab === "due"
                  ? "bg-brand-600 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {due.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("forecast")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === "forecast"
                ? "border-brand-600 text-brand-600 dark:text-brand-400"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="size-4" />
            <span>14-Day Forecast</span>
          </button>
        </div>

        {activeTab === "due" && due.length > 0 && (
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              title="Group topics by material"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                viewMode === "grouped"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers className="size-3.5" />
              <span>By Material</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              title="Show flat list of all topics"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                viewMode === "flat"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" />
              <span>Compact List</span>
            </button>
          </div>
        )}
      </div>

      {/* ── TAB 1: ACTIVE QUEUE ── */}
      {activeTab === "due" && (
        <div className="flex flex-col gap-5">
          {/* Search, Filter Tabs & Sort Controls */}
          {due.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search topics or materials…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Filters & Sort */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter buttons */}
                <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setFilterSignal("all")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                      filterSignal === "all"
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    All ({due.length})
                  </button>
                  {metrics.needsReview > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterSignal("needs_review")}
                      className={cn(
                        "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                        filterSignal === "needs_review"
                          ? "bg-review-600 text-white shadow-xs"
                          : "text-review-600 hover:bg-review-500/10 dark:text-review-400",
                      )}
                    >
                      <AlertTriangle className="size-3" />
                      <span>Needs Review ({metrics.needsReview})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterSignal("low_mastery")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                      filterSignal === "low_mastery"
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Low Mastery
                  </button>
                </div>

                {/* Sort selector */}
                <DropdownSelect<SortOption>
                  value={sortBy}
                  onChange={setSortBy}
                  options={SORT_OPTIONS}
                  size="sm"
                  ariaLabel="Sort reviews"
                  className="w-auto"
                  triggerClassName="min-w-[155px]"
                />
              </div>
            </div>
          )}

          {/* Empty state when queue has 0 items */}
          {due.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">You&apos;re all caught up!</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Nothing is due right now. Check the 14-day forecast to see what&apos;s upcoming, or upload fresh study material in your library.
              </p>
              <Link
                href="/library"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
              >
                Go to Library
              </Link>
            </div>
          ) : filteredDue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              <Search className="size-6 opacity-40" />
              <p>No topics match your search or filter criteria.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterSignal("all");
                }}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : viewMode === "grouped" ? (
            /* ── GROUPED BY MATERIAL VIEW ── */
            <div className="flex flex-col gap-4">
              {groupedDue.map((group) => {
                const isCollapsed = !!collapsedDocs[group.documentId];
                const format = getDocumentFormatIcon(group.documentTitle);
                const FormatIcon = format.icon;

                return (
                  <div
                    key={group.documentId}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all"
                  >
                    {/* Material Group Header */}
                    <div
                      onClick={() => toggleDocCollapse(group.documentId)}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/80 bg-accent/20 p-4 transition hover:bg-accent/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          className="text-muted-foreground transition hover:text-foreground"
                          aria-label={isCollapsed ? "Expand group" : "Collapse group"}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                            format.badgeColor,
                          )}
                        >
                          <FormatIcon className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-heading text-sm font-semibold text-foreground sm:text-base">
                              {group.documentTitle}
                            </h3>
                            {group.hasUrgent && (
                              <span className="flex items-center gap-1 rounded-full bg-review-500/15 px-2 py-0.5 text-[10px] font-semibold text-review-700 dark:text-review-300">
                                <AlertTriangle className="size-2.5" />
                                <span>Action needed</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {group.items.length} {group.items.length === 1 ? "topic" : "topics"} due • Avg. mastery {group.avgMastery}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/library/${group.documentId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-brand-500/50 hover:bg-accent hover:text-foreground sm:flex"
                        >
                          <span>Open Material</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Topics inside this material */}
                    {!isCollapsed && (
                      <div className="divide-y divide-border/60 bg-card">
                        {group.items.map((item) => {
                          const cleanTitle = cleanTopicTitle(item.topicTitle, item.documentTitle);
                          const masteryPercent = Math.round((item.masteryScore || 0) * 100);

                          return (
                            <Link
                              key={item.topicId}
                              href={`/library/${item.documentId}`}
                              className="group flex flex-col gap-2 p-3.5 transition hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-foreground transition group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                  {cleanTitle}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-4 sm:justify-end">
                                {/* Mastery progress bar */}
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-20">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        masteryPercent < 40
                                          ? "bg-rose-500"
                                          : masteryPercent < 75
                                            ? "bg-amber-500"
                                            : "bg-emerald-500",
                                      )}
                                      style={{ width: `${Math.max(5, masteryPercent)}%` }}
                                    />
                                  </div>
                                  <span className="w-9 text-right font-mono text-xs text-muted-foreground">
                                    {masteryPercent}%
                                  </span>
                                </div>

                                <ReviewSignalBadge signal={item.signal} />

                                <span className="flex size-7 items-center justify-center rounded-lg bg-transparent text-muted-foreground transition group-hover:bg-brand-500 group-hover:text-white">
                                  <ArrowRight className="size-3.5" />
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── FLAT COMPACT LIST VIEW ── */
            <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-xs">
              {filteredDue.map((item) => {
                const cleanTitle = cleanTopicTitle(item.topicTitle, item.documentTitle);
                const format = getDocumentFormatIcon(item.documentTitle);
                const FormatIcon = format.icon;
                const masteryPercent = Math.round((item.masteryScore || 0) * 100);

                return (
                  <Link
                    key={item.topicId}
                    href={`/library/${item.documentId}`}
                    className="group flex flex-col gap-2 p-3.5 transition hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                          format.badgeColor,
                        )}
                      >
                        <FormatIcon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm text-foreground transition group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {cleanTitle}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.documentTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-20">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              masteryPercent < 40
                                ? "bg-rose-500"
                                : masteryPercent < 75
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.max(5, masteryPercent)}%` }}
                          />
                        </div>
                        <span className="w-9 text-right font-mono text-xs text-muted-foreground">
                          {masteryPercent}%
                        </span>
                      </div>

                      <ReviewSignalBadge signal={item.signal} />

                      <span className="flex size-7 items-center justify-center rounded-lg bg-transparent text-muted-foreground transition group-hover:bg-brand-500 group-hover:text-white">
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: 14-DAY FORECAST ── */}
      {activeTab === "forecast" && (
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Spaced Repetition Schedule (Next 14 Days)
            </h3>
            <p className="text-xs text-muted-foreground">
              Click on any day below to inspect scheduled topic reviews.
            </p>
          </div>

          {/* Day selection strip */}
          <div className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-14 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {calendar.map((day) => {
              const date = new Date(day.date);
              const isToday = day.date === todayKey();
              const isSelected = day.date === selectedCalendarDay;
              const hasUrgent = day.items.some((i) => i.signal === ReviewSignal.NEEDS_REVIEW);

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedCalendarDay(day.date)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-14 shrink-0 snap-center flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all sm:w-auto active:scale-95",
                    isSelected
                      ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                      : isToday
                        ? "border-brand-500/60 bg-brand-500/10 dark:bg-brand-950/40 text-foreground"
                        : "border-border bg-background hover:border-brand-300 hover:bg-accent/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase",
                      isSelected ? "text-brand-100" : "text-muted-foreground",
                    )}
                  >
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className="text-sm font-bold">{date.getDate()}</span>
                  <span
                    className={cn(
                      "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                      day.items.length === 0
                        ? "invisible"
                        : isSelected
                          ? "bg-white/25 text-white"
                          : hasUrgent
                            ? "bg-review-600 text-white"
                            : "bg-brand-600 text-white",
                    )}
                  >
                    {day.items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected day list */}
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading text-sm font-semibold text-foreground">
                {new Date(selectedCalendarDay).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
                {selectedCalendarDay === todayKey() && (
                  <span className="ml-2 rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    Today
                  </span>
                )}
              </h4>
              <span className="text-xs text-muted-foreground">
                {activeCalendarDay.items.length} {activeCalendarDay.items.length === 1 ? "topic" : "topics"} scheduled
              </span>
            </div>

            {activeCalendarDay.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                <CalendarDays className="size-5 opacity-40" />
                <span>No reviews scheduled for this date. You have this day clear!</span>
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border bg-background">
                {activeCalendarDay.items.map((item) => {
                  const cleanTitle = cleanTopicTitle(item.topicTitle, item.documentTitle);
                  const format = getDocumentFormatIcon(item.documentTitle);
                  const FormatIcon = format.icon;
                  const masteryPercent = Math.round((item.masteryScore || 0) * 100);

                  return (
                    <Link
                      key={item.topicId}
                      href={`/library/${item.documentId}`}
                      className="group flex flex-col gap-2 p-3 text-xs transition hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                            format.badgeColor,
                          )}
                        >
                          <FormatIcon className="size-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground transition group-hover:text-brand-600 dark:group-hover:text-brand-400">
                            {cleanTitle}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.documentTitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{masteryPercent}% mastery</span>
                        <ReviewSignalBadge signal={item.signal} />
                        <ArrowRight className="size-3 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
