"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Headphones,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  MessageSquare,
  RotateCcw,
  Radio,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clientFetch } from "@/lib/api-client";
import type {
  AdaptedPresentationResponse,
  VisualPresentation,
  StoriesAnalogiesPresentation,
  PracticalExamplesPresentation,
  ScenarioPresentation,
  StepByStepPresentation,
  AudioLessonPresentation,
  ConversationalPresentation,
  NoteSection,
} from "@aida/shared";
import { LearningMethod } from "@aida/shared";
import { cn } from "cn";

// ── Visual ────────────────────────────────────────────────────────────────────
function VisualView({ data }: { data: VisualPresentation }) {
  return (
    <div className="flex flex-col gap-6">
      {data.mermaidCode && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Concept Diagram
          </h3>
          <div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre text-foreground/80">
            {data.mermaidCode}
          </div>
          <p className="text-xs text-muted-foreground italic">
            💡 Paste the code above into{" "}
            <a
              href="https://mermaid.live"
              target="_blank"
              rel="noopener"
              className="underline hover:text-foreground"
            >
              mermaid.live
            </a>{" "}
            to render the interactive diagram.
          </p>
        </div>
      )}

      {data.charts && data.charts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Visual Insights
          </h3>
          {data.charts.map((chart, i) => (
            <div
              key={i}
              className="rounded-xl border border-brand-200/60 bg-brand-50/30 dark:border-brand-800/40 dark:bg-brand-950/20 p-4"
            >
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                {chart.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {chart.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.visualBreakdown && data.visualBreakdown.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Visual Breakdown
          </h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">
                    Component
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">
                    Key Takeaway
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.visualBreakdown.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-border last:border-0",
                      i % 2 === 0 ? "bg-background" : "bg-muted/20",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.content}
                    </td>
                    <td className="px-4 py-3 text-brand-700 dark:text-brand-300 font-medium">
                      {row.keyTakeaway}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stories & Analogies ───────────────────────────────────────────────────────
function StoriesAnalogiesView({ data }: { data: StoriesAnalogiesPresentation }) {
  return (
    <div className="flex flex-col gap-6">
      {data.coreStory && (
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📖</span>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              {data.coreStory.title}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {data.coreStory.narrative}
          </p>
          {data.coreStory.moralOrTakeaway && (
            <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-100/60 dark:border-amber-700/40 dark:bg-amber-900/20 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1">
                Moral / Key Takeaway
              </p>
              <p className="text-sm text-foreground/80">
                {data.coreStory.moralOrTakeaway}
              </p>
            </div>
          )}
        </div>
      )}

      {data.analogies && data.analogies.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Analogies
          </h3>
          {data.analogies.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60 text-xs font-bold text-brand-700 dark:text-brand-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.concept}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground italic">
                    &ldquo;{item.analogy}&rdquo;
                  </p>
                  <p className="mt-2 text-xs text-brand-700 dark:text-brand-300">
                    ✦ {item.whyItWorks}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Practical Examples ────────────────────────────────────────────────────────
function PracticalExamplesView({ data }: { data: PracticalExamplesPresentation }) {
  return (
    <div className="flex flex-col gap-4">
      {data.examples?.map((ex, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="border-b border-border bg-muted/30 px-4 py-2.5 flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              {i + 1}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {ex.title}
            </span>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Context
              </p>
              <p className="text-sm text-foreground/90">{ex.context}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Demonstration
              </p>
              <p className="text-sm text-foreground/90">{ex.demonstration}</p>
            </div>
            <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                Real-World Impact
              </p>
              <p className="text-sm text-foreground/80">{ex.realWorldImpact}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
function ScenariosView({ data }: { data: ScenarioPresentation }) {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {data.scenarios?.map((sc, i) => {
        const isOpen = expanded === i;
        return (
          <div
            key={i}
            className="rounded-xl border border-border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : i)}
              className="flex w-full items-center justify-between bg-card px-4 py-3 text-left transition hover:bg-accent/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50 text-xs font-bold text-purple-700 dark:text-purple-300">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {sc.title}
                </span>
              </div>
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-90",
                )}
              />
            </button>

            {isOpen && (
              <div className="border-t border-border bg-muted/10 flex flex-col gap-3 p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Scenario
                  </p>
                  <p className="text-sm text-foreground/90">{sc.scenario}</p>
                </div>
                <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 dark:border-amber-800/40 dark:bg-amber-950/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                    Challenge
                  </p>
                  <p className="text-sm text-foreground/80">{sc.challenge}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Optimal Approach
                  </p>
                  <p className="text-sm text-foreground/90">{sc.optimalApproach}</p>
                </div>
                <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-800/40 dark:bg-emerald-950/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                    Analysis
                  </p>
                  <p className="text-sm text-foreground/80">{sc.analysis}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step-by-Step ──────────────────────────────────────────────────────────────
function StepByStepView({ data }: { data: StepByStepPresentation }) {
  const [activeStep, setActiveStep] = useState(0);
  const steps = data.steps ?? [];

  return (
    <div className="flex flex-col gap-5">
      {data.overview && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
          {data.overview}
        </div>
      )}

      {/* Step Progress */}
      <div className="flex items-center gap-0">
        {steps.map((_, i) => (
          <div key={i} className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveStep(i)}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                i === activeStep
                  ? "border-brand-500 bg-brand-500 text-white"
                  : i < activeStep
                  ? "border-brand-300 bg-brand-100 text-brand-700 dark:border-brand-700 dark:bg-brand-900/60 dark:text-brand-300"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {i + 1}
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 transition-all",
                  i < activeStep ? "bg-brand-400" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Active Step Card */}
      {steps[activeStep] && (
        <div className="rounded-xl border border-brand-200/60 bg-brand-50/30 dark:border-brand-800/40 dark:bg-brand-950/20 flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {steps[activeStep].stepNumber}
            </span>
            <h3 className="text-base font-semibold text-foreground pt-1">
              {steps[activeStep].title}
            </h3>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed">
            {steps[activeStep].explanation}
          </p>

          <div className="rounded-lg border border-brand-200/50 bg-brand-100/40 dark:border-brand-800/40 dark:bg-brand-900/20 px-3 py-2">
            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mb-0.5">
              Key Rule
            </p>
            <p className="text-sm text-foreground/80">
              {steps[activeStep].keyActionOrRule}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card flex flex-col gap-2 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Check
            </p>
            <p className="text-sm font-medium text-foreground">
              {steps[activeStep].quickCheckQuestion}
            </p>
            <details className="group">
              <summary className="cursor-pointer text-xs text-brand-600 hover:underline list-none">
                Show Answer ▾
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                {steps[activeStep].quickCheckAnswer}
              </p>
            </details>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-xs text-muted-foreground">
              {activeStep + 1} / {steps.length}
            </span>
            <button
              type="button"
              disabled={activeStep === steps.length - 1}
              onClick={() =>
                setActiveStep((s) => Math.min(steps.length - 1, s + 1))
              }
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audio Lesson ──────────────────────────────────────────────────────────────
function AudioLessonView({ data }: { data: AudioLessonPresentation }) {
  const [activeSection, setActiveSection] = useState(0);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const sections = useMemo(
    () => [
      { heading: "Introduction", spokenText: data.intro },
      ...(data.sections ?? []),
      { heading: "Recap", spokenText: data.recap },
    ],
    [data.intro, data.sections, data.recap],
  );
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeSectionRef = useRef(0);
  const autoPlayNextRef = useRef(true);
  const sectionsRef = useRef(sections);

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    autoPlayNextRef.current = autoPlayNext;
  }, [autoPlayNext]);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speakSection(index: number) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const section = sectionsRef.current[index];
    if (!section || !section.spokenText) {
      setSpeaking(false);
      return;
    }

    activeSectionRef.current = index;
    setActiveSection(index);

    const utter = new SpeechSynthesisUtterance(section.spokenText);
    utter.rate = 0.95;
    utter.onend = () => {
      // Auto-advance and auto-play next chapter if enabled
      if (
        autoPlayNextRef.current &&
        activeSectionRef.current + 1 < sectionsRef.current.length
      ) {
        const nextIdx = activeSectionRef.current + 1;
        setTimeout(() => {
          speakSection(nextIdx);
        }, 500);
      } else {
        setSpeaking(false);
      }
    };
    utter.onerror = () => {
      setSpeaking(false);
    };

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  function next() {
    const nextIdx = Math.min(sections.length - 1, activeSection + 1);
    if (speaking) {
      speakSection(nextIdx);
    } else {
      setActiveSection(nextIdx);
    }
  }

  function prev() {
    const prevIdx = Math.max(0, activeSection - 1);
    if (speaking) {
      speakSection(prevIdx);
    } else {
      setActiveSection(prevIdx);
    }
  }

  const currentSection = sections[activeSection];
  const progressPercent = Math.round(((activeSection + 1) / sections.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Title & Auto-Play Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-5 dark:border-violet-900/40 dark:from-violet-950/30">
        <div className="flex items-center gap-3">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
            <Headphones className="size-6" />
            {speaking && (
              <span className="absolute -top-1 -right-1 flex size-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-3.5 rounded-full bg-violet-500" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Audio Masterclass
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                Section {activeSection + 1} of {sections.length} (~{data.durationEstimateMinutes} min)
              </span>
            </div>
            <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
              {data.title}
            </h2>
          </div>
        </div>

        {/* Auto-play toggle button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAutoPlayNext((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all select-none",
              autoPlayNext
                ? "border-violet-400 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                : "border-border bg-card text-muted-foreground hover:bg-accent/40"
            )}
            title="Automatically play the next section when the current section finishes"
          >
            <Radio className={cn("size-3.5", autoPlayNext && "animate-pulse text-violet-600 dark:text-violet-400")} />
            Auto-play next section: <strong className="font-bold">{autoPlayNext ? "ON" : "OFF"}</strong>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-violet-600 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Section Pill Switcher */}
      <div className="flex flex-wrap gap-2">
        {sections.map((sec, i) => {
          const isCurrent = i === activeSection;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (speaking) {
                  speakSection(i);
                } else {
                  setActiveSection(i);
                }
              }}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all",
                isCurrent
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                  : "border border-border/80 bg-card text-muted-foreground hover:border-violet-400/40 hover:text-foreground"
              )}
            >
              {speaking && isCurrent && (
                <span className="flex items-center gap-0.5">
                  <span className="size-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="size-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="size-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
              <span>{sec.heading}</span>
            </button>
          );
        })}
      </div>

      {/* Active Section Player Card */}
      {currentSection && (
        <div className="rounded-2xl border border-violet-200/80 bg-card p-6 shadow-sm dark:border-violet-900/50">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                {activeSection + 1}
              </span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                {currentSection.heading}
              </h3>
            </div>
            {speaking && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 animate-pulse">
                <Volume2 className="size-3.5" /> Playing narration…
              </span>
            )}
          </div>

          <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {currentSection.spokenText}
          </p>

          {/* Player Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={prev}
              disabled={activeSection === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent disabled:opacity-40"
            >
              <SkipBack className="size-3.5" /> Prev
            </button>

            {!speaking ? (
              <button
                type="button"
                onClick={() => speakSection(activeSection)}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/20 transition hover:bg-violet-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="size-3.5 fill-current" /> Listen to Chapter
              </button>
            ) : (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-violet-800"
              >
                <Pause className="size-3.5 fill-current" /> Pause Narration
              </button>
            )}

            <button
              type="button"
              onClick={next}
              disabled={activeSection === sections.length - 1}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent disabled:opacity-40"
            >
              <SkipForward className="size-3.5" /> Next Chapter
            </button>

            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Volume2 className="size-3.5" />
              Browser TTS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Conversational ────────────────────────────────────────────────────────────
function parseConversationalTurns(
  data?: ConversationalPresentation,
  rawMarkdown?: string,
): { speaker: "tutor" | "student"; text: string }[] {
  if (data?.dialogue && data.dialogue.length > 0) {
    return data.dialogue;
  }

  // Handle literal escaped \n strings as well as real newlines
  const text = (rawMarkdown ?? "").replace(/\\n/g, "\n");
  if (!text) return [];

  // Match Tutor: or Student: turns
  const regex = /(?:^|\n+)(?:(?:\*\*)?(Tutor|Student|Teacher|Assistant|User)(?:\*\*)?:\s*)/gi;
  const turns: { speaker: "tutor" | "student"; text: string }[] = [];

  const parts = text.split(regex);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i += 2) {
      const roleStr = parts[i]?.toLowerCase() ?? "";
      const isTutor =
        roleStr.includes("tutor") ||
        roleStr.includes("teacher") ||
        roleStr.includes("assistant");
      const content = parts[i + 1]?.trim();
      if (content) {
        turns.push({
          speaker: isTutor ? "tutor" : "student",
          text: content,
        });
      }
    }
  }

  if (turns.length === 0 && text.trim()) {
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    paragraphs.forEach((p, idx) => {
      turns.push({
        speaker: idx % 2 === 0 ? "tutor" : "student",
        text: p.trim(),
      });
    });
  }

  return turns;
}

function ConversationalView({
  data,
  markdown,
}: {
  data?: ConversationalPresentation;
  markdown?: string;
}) {
  const turns = parseConversationalTurns(data, markdown);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [revealedCount, setRevealedCount] = useState(2);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const speakingRef = useRef<number | null>(null);

  useEffect(() => {
    speakingRef.current = speakingIdx;
  }, [speakingIdx]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speakTurn(index: number) {
    if (!("speechSynthesis" in window) || index >= turns.length) {
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const turn = turns[index];
    const utter = new SpeechSynthesisUtterance(turn.text);
    // Distinct pitch for Tutor vs Student
    utter.pitch = turn.speaker === "tutor" ? 1.0 : 1.25;
    utter.rate = 1.0;
    utter.onend = () => {
      if (speakingRef.current !== null && index + 1 < turns.length) {
        setTimeout(() => speakTurn(index + 1), 400);
      } else {
        setSpeakingIdx(null);
      }
    };
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(index);
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);
  }

  const visibleTurns = interactiveMode ? turns.slice(0, revealedCount) : turns;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-200/70 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent p-5 dark:border-brand-900/40 dark:from-brand-950/30">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
            <MessageSquare className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Socratic Dialogue
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {turns.length} exchange turns
              </span>
            </div>
            <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
              {data?.title ?? "Interactive Conversational Learning"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {data?.introduction ?? "Guided discovery through an engaging question-and-answer dialogue."}
            </p>
          </div>
        </div>

        {/* Mode controls & Speech Narration */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {speakingIdx === null ? (
            <button
              type="button"
              onClick={() => speakTurn(0)}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 shadow-sm"
            >
              <Play className="size-3 fill-current" /> Read Aloud
            </button>
          ) : (
            <button
              type="button"
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-800"
            >
              <Pause className="size-3 fill-current" /> Pause
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setInteractiveMode((v) => !v);
              setRevealedCount(2);
            }}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all select-none",
              interactiveMode
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-950/40 dark:text-brand-300"
                : "border-border bg-card text-muted-foreground hover:bg-accent/40"
            )}
          >
            {interactiveMode ? "Interactive: Active" : "Interactive Practice Mode"}
          </button>
        </div>
      </div>

      {/* Interactive Mode progress bar if active */}
      {interactiveMode && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/30 px-4 py-2.5 text-xs">
          <span className="text-muted-foreground">
            Exchange <strong>{Math.min(visibleTurns.length, turns.length)}</strong> of <strong>{turns.length}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRevealedCount((c) => Math.min(turns.length, c + 2))}
              disabled={revealedCount >= turns.length}
              className="rounded-lg bg-brand-600 px-3 py-1 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
            >
              Reveal Next Exchange
            </button>
            <button
              type="button"
              onClick={() => setRevealedCount(2)}
              className="rounded-lg border border-border px-2.5 py-1 text-muted-foreground hover:bg-accent"
              title="Start Over"
            >
              <RotateCcw className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Dialogue Stream */}
      <div className="flex flex-col gap-4">
        {visibleTurns.map((turn, i) => {
          const isTutor = turn.speaker === "tutor";
          const isSpeakingNow = speakingIdx === i;

          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 transition-all duration-200",
                isTutor ? "justify-start" : "justify-end flex-row-reverse"
              )}
            >
              {/* Avatar Icon */}
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform",
                  isSpeakingNow && "scale-110 ring-2 ring-brand-500",
                  isTutor
                    ? "bg-brand-500/15 text-brand-600 dark:bg-brand-500/25 dark:text-brand-300"
                    : "bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-300"
                )}
              >
                {isTutor ? <Sparkles className="size-4" /> : <User className="size-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  "flex max-w-[85%] flex-col gap-1.5 rounded-2xl p-4 shadow-xs transition-all",
                  isSpeakingNow && "ring-2 ring-brand-500/50",
                  isTutor
                    ? "rounded-tl-xs border border-border/80 bg-card text-foreground"
                    : "rounded-tr-xs border border-violet-200/60 bg-violet-50/40 text-foreground dark:border-violet-800/40 dark:bg-violet-950/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider",
                      isTutor
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-violet-600 dark:text-violet-400"
                    )}
                  >
                    {isTutor ? "AI Tutor" : "Student"}
                  </span>
                  {isSpeakingNow && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 animate-pulse">
                      <Volume2 className="size-3" /> Speaking…
                    </span>
                  )}
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {turn.text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Takeaway Card */}
      {data?.summaryTakeaway && (
        <div className="mt-2 rounded-2xl border border-amber-300/60 bg-amber-50/50 p-5 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
            ✦ Core Socratic Takeaway
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {data.summaryTakeaway}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Direct Notes ──────────────────────────────────────────────────────────────
function DirectNotesView({
  notes,
  markdown,
}: {
  notes?: NoteSection[];
  markdown?: string;
}) {
  if (markdown) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    );
  }

  if (notes && notes.length > 0) {
    return (
      <div className="flex flex-col gap-6">
        {notes.map((section) => (
          <div key={section.anchor}>
            <h3 className="font-heading text-base font-semibold text-foreground">
              {section.heading}
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {section.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">No notes generated for this method.</p>
  );
}

// ── Main Presentation View ────────────────────────────────────────────────────
function renderContent(
  content: AdaptedPresentationResponse["content"],
  method?: LearningMethod,
) {
  if (content.visual) return <VisualView data={content.visual} />;
  if (content.storiesAnalogies)
    return <StoriesAnalogiesView data={content.storiesAnalogies} />;
  if (content.practicalExamples)
    return <PracticalExamplesView data={content.practicalExamples} />;
  if (content.scenarios) return <ScenariosView data={content.scenarios} />;
  if (content.stepByStep) return <StepByStepView data={content.stepByStep} />;
  if (content.audioLesson) return <AudioLessonView data={content.audioLesson} />;
  if (
    content.conversational ||
    method === LearningMethod.CONVERSATIONAL ||
    (content.markdown &&
      (content.markdown.includes("Tutor:") ||
        content.markdown.includes("Student:")))
  ) {
    return (
      <ConversationalView
        data={content.conversational}
        markdown={content.markdown}
      />
    );
  }
  if (content.directNotes || content.markdown)
    return (
      <DirectNotesView notes={content.directNotes} markdown={content.markdown} />
    );
  return (
    <p className="text-sm text-muted-foreground">
      No content available for this learning method.
    </p>
  );
}

export function AdaptedPresentationView({
  topicId,
  method,
}: {
  topicId: string;
  method: LearningMethod;
  onMethodChange?: (m: LearningMethod) => void;
}) {
  const [data, setData] = useState<AdaptedPresentationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Asynchronously begin loading to avoid synchronous setState inside effect body
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
        setData(null);
      }
    });

    clientFetch<AdaptedPresentationResponse>(
      `/topics/${topicId}/present?method=${method}`,
    )
      .then((res) => {
        if (!cancelled) {
          setData(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load presentation.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [topicId, method]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="size-8 animate-spin text-brand-500" />
        <p className="text-sm text-muted-foreground">
          Generating your {method.replace(/_/g, " ").toLowerCase()} presentation…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 p-8 text-center dark:border-danger-900/40 dark:bg-danger-950/20">
        <AlertCircle className="size-7 text-danger-600" />
        <p className="text-sm text-danger-900 dark:text-danger-200">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            clientFetch<AdaptedPresentationResponse>(
              `/topics/${topicId}/present?method=${method}`,
            )
              .then(setData)
              .catch((e) => setError(e?.message ?? "Failed."))
              .finally(() => setLoading(false));
          }}
          className="flex items-center gap-1.5 rounded-lg border border-danger-200 bg-background px-3 py-1.5 text-xs font-medium text-danger-700 hover:bg-danger-50 dark:text-danger-300"
        >
          <RefreshCw className="size-3" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return renderContent(data.content, method);
}
