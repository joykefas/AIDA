"use client";

import { useEffect, useRef, useState } from "react";
import {
  Headphones,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  Volume2,
  AlertCircle,
  Loader2,
  RefreshCw,
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
  const sections = [
    { heading: "Introduction", spokenText: data.intro },
    ...(data.sections ?? []),
    { heading: "Recap", spokenText: data.recap },
  ];
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  function speakCurrent() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(
      sections[activeSection]?.spokenText ?? "",
    );
    utter.rate = 0.95;
    utter.onend = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function next() {
    stopSpeaking();
    setActiveSection((s) => Math.min(sections.length - 1, s + 1));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
          <Headphones className="size-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{data.title}</p>
          <p className="text-xs text-muted-foreground">
            ~{data.durationEstimateMinutes} min · {sections.length} sections
          </p>
        </div>
      </div>

      {/* Section List */}
      <div className="flex flex-wrap gap-2">
        {sections.map((sec, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              stopSpeaking();
              setActiveSection(i);
            }}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition",
              i === activeSection
                ? "bg-violet-500 text-white"
                : "border border-border bg-card text-muted-foreground hover:bg-accent/40",
            )}
          >
            {sec.heading}
          </button>
        ))}
      </div>

      {/* Active Section */}
      {sections[activeSection] && (
        <div className="rounded-xl border border-violet-200/60 bg-violet-50/30 dark:border-violet-800/40 dark:bg-violet-950/20 flex flex-col gap-4 p-5">
          <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            {sections[activeSection].heading}
          </h3>
          <p className="text-sm leading-[1.8] text-foreground/90">
            {sections[activeSection].spokenText}
          </p>

          <div className="flex items-center gap-2 pt-1">
            {!speaking ? (
              <button
                type="button"
                onClick={speakCurrent}
                className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-600"
              >
                <Play className="size-3" /> Listen
              </button>
            ) : (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-800"
              >
                <Pause className="size-3" /> Stop
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={activeSection === sections.length - 1}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            >
              <SkipForward className="size-3" /> Next
            </button>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Volume2 className="size-3" />
              Browser TTS
            </span>
          </div>
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
function renderContent(content: AdaptedPresentationResponse["content"]) {
  if (content.visual) return <VisualView data={content.visual} />;
  if (content.storiesAnalogies)
    return <StoriesAnalogiesView data={content.storiesAnalogies} />;
  if (content.practicalExamples)
    return <PracticalExamplesView data={content.practicalExamples} />;
  if (content.scenarios) return <ScenariosView data={content.scenarios} />;
  if (content.stepByStep) return <StepByStepView data={content.stepByStep} />;
  if (content.audioLesson) return <AudioLessonView data={content.audioLesson} />;
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

  return renderContent(data.content);
}
