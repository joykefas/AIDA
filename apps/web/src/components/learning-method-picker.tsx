"use client";

import { useState } from "react";
import {
  Layers,
  BookOpen,
  Map,
  Headphones,
  FileText,
  MessageSquare,
  Wrench,
  Clapperboard,
  ListOrdered,
  Check,
} from "lucide-react";
import { LearningMethod } from "@aida/shared";
import { cn } from "cn";

export const LEARNING_METHODS: {
  value: LearningMethod;
  label: string;
  desc: string;
  icon: typeof Layers;
}[] = [
  {
    value: LearningMethod.VISUAL,
    label: "Visual Learning",
    desc: "Diagrams, charts, mermaid flows, and structured visual breakdowns.",
    icon: Layers,
  },
  {
    value: LearningMethod.STORIES_ANALOGIES,
    label: "Stories & Analogies",
    desc: "Relatable narratives and real-world comparisons to anchor abstract ideas.",
    icon: BookOpen,
  },
  {
    value: LearningMethod.MIND_MAPS,
    label: "Mind Maps",
    desc: "Hierarchical visual maps showing relationships between concepts and subtopics.",
    icon: Map,
  },
  {
    value: LearningMethod.AUDIO,
    label: "Audio-Style",
    desc: "Natural spoken-word cadence — perfect for listening while commuting.",
    icon: Headphones,
  },
  {
    value: LearningMethod.DIRECT_NOTES,
    label: "Direct Notes",
    desc: "Concise, high-yield bullet notes — just the key information.",
    icon: FileText,
  },
  {
    value: LearningMethod.CONVERSATIONAL,
    label: "Conversational",
    desc: "Socratic back-and-forth dialogue that guides you to answers.",
    icon: MessageSquare,
  },
  {
    value: LearningMethod.PRACTICAL_EXAMPLES,
    label: "Practical Examples",
    desc: "Real-world demonstrations showing exactly how concepts apply in practice.",
    icon: Wrench,
  },
  {
    value: LearningMethod.SCENARIOS,
    label: "Scenario-Based",
    desc: "Realistic situations and use cases that put knowledge into action.",
    icon: Clapperboard,
  },
  {
    value: LearningMethod.STEP_BY_STEP,
    label: "Step-by-Step",
    desc: "Progressive sequential lessons from foundations to full mastery.",
    icon: ListOrdered,
  },
];

interface LearningMethodPickerProps {
  selected: LearningMethod[];
  onChange: (selected: LearningMethod[]) => void;
  multiSelect?: boolean;
  compact?: boolean;
  className?: string;
}

export function LearningMethodPicker({
  selected,
  onChange,
  multiSelect = true,
  compact = false,
  className,
}: LearningMethodPickerProps) {
  function toggle(method: LearningMethod) {
    if (!multiSelect) {
      onChange([method]);
      return;
    }
    if (selected.includes(method)) {
      onChange(selected.filter((m) => m !== method));
    } else {
      onChange([...selected, method]);
    }
  }

  return (
    <div
      className={cn(
        compact
          ? "grid grid-cols-2 gap-2 sm:grid-cols-3"
          : "grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {LEARNING_METHODS.map(({ value, label, desc, icon: Icon }) => {
        const isSelected = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            id={`learning-method-${value.toLowerCase()}`}
            onClick={() => toggle(value)}
            aria-pressed={isSelected}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 select-none",
              compact ? "flex-row items-center gap-2 p-2.5" : "flex-col",
              isSelected
                ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 dark:bg-brand-950/50 dark:border-brand-500"
                : "border-border hover:border-brand-300/70 hover:bg-accent/40 active:scale-[0.98]",
            )}
          >
            {/* Check badge */}
            {isSelected && (
              <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-brand-500">
                <Check className="size-2.5 text-white" />
              </span>
            )}

            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg",
                compact ? "size-7" : "size-8",
                isSelected
                  ? "bg-brand-100 dark:bg-brand-900/60"
                  : "bg-muted/60",
              )}
            >
              <Icon
                className={cn(
                  compact ? "size-3.5" : "size-4",
                  isSelected ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground",
                )}
              />
            </div>

            <div className={cn("min-w-0", compact && "flex flex-col")}>
              <span
                className={cn(
                  "font-medium leading-tight",
                  compact ? "text-xs" : "text-sm",
                  isSelected ? "text-brand-700 dark:text-brand-300" : "text-foreground",
                )}
              >
                {label}
              </span>
              {!compact && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Inline floating switcher for quick method changes during a session */
export function LearningMethodQuickSwitcher({
  current,
  onChange,
}: {
  current: LearningMethod | null;
  onChange: (method: LearningMethod) => void;
}) {
  const [open, setOpen] = useState(false);

  const currentMethod = LEARNING_METHODS.find((m) => m.value === current);
  const Icon = currentMethod?.icon ?? Layers;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        id="learning-method-quick-switcher"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-brand-400 hover:bg-accent/40"
      >
        <Icon className="size-3.5 text-brand-600" />
        <span>{currentMethod?.label ?? "Select method"}</span>
        <span className="text-muted-foreground">▾</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full z-40 mt-1.5 w-72 rounded-xl border border-border bg-card p-2 shadow-xl backdrop-blur-sm">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Switch learning method
            </p>
            {LEARNING_METHODS.map(({ value, label, icon: MIcon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onChange(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  current === value
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <MIcon className="size-3.5 shrink-0" />
                {label}
                {current === value && <Check className="ml-auto size-3 text-brand-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
