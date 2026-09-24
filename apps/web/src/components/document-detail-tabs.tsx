"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel } from "@/components/ui/tabs";
import { MindMap } from "@/components/mind-map";
import { QuizRunner } from "@/components/quiz-runner";
import { TutorChat } from "@/components/tutor-chat";
import {
  LearningMethodPicker,
  LearningMethodQuickSwitcher,
  LEARNING_METHODS,
} from "@/components/learning-method-picker";
import { AdaptedPresentationView } from "@/components/adapted-presentation-view";
import { clientFetch } from "@/lib/api-client";
import type { TopicDetail } from "@aida/shared";
import { LearningMethod } from "@aida/shared";
import { Sparkles } from "lucide-react";

export function DocumentDetailTabs({
  topic,
  documentTitle,
  topics,
}: {
  topic: TopicDetail;
  documentTitle?: string;
  topics?: { id: string; title: string }[];
}) {
  const [tab, setTab] = useState("summary");

  // Learning preferences state
  const [selectedMethods, setSelectedMethods] = useState<LearningMethod[]>([]);
  const [activePresentationMethod, setActivePresentationMethod] =
    useState<LearningMethod | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  async function savePreferences(methods: LearningMethod[]) {
    setSavingPrefs(true);
    try {
      await clientFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ learningPreferences: methods }),
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } catch {
      // silent — preference save is best-effort
    } finally {
      setSavingPrefs(false);
    }
  }

  function handleMethodSelect(methods: LearningMethod[]) {
    setSelectedMethods(methods);
    if (methods.length > 0 && !activePresentationMethod) {
      setActivePresentationMethod(methods[0]);
    }
  }

  function handleStartLearning() {
    if (selectedMethods.length > 0) {
      setActivePresentationMethod(selectedMethods[0]);
    }
    void savePreferences(selectedMethods);
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
      <TabsList>
        <TabsIndicator />
        <TabsTab value="summary">Summary</TabsTab>
        <TabsTab value="notes">Notes</TabsTab>
        <TabsTab value="learn">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Learn
          </span>
        </TabsTab>
        <TabsTab value="mindmap">Mind Map</TabsTab>
        <TabsTab value="quiz">Quiz</TabsTab>
        <TabsTab value="tutor">Ask Tutor</TabsTab>
      </TabsList>

      {/* Summary */}
      <TabsPanel value="summary">
        <p className="text-pretty leading-relaxed text-foreground">{topic.summary}</p>
      </TabsPanel>

      {/* Notes */}
      <TabsPanel value="notes">
        <div className="flex flex-col gap-6">
          {topic.notes.map((section) => (
            <div key={section.anchor} id={section.anchor} className="scroll-mt-20">
              <h3 className="font-heading text-lg font-semibold">{section.heading}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {section.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </TabsPanel>

      {/* Learn (Adaptive Learning Mode) */}
      <TabsPanel value="learn">
        {!activePresentationMethod ? (
          /* Method selection screen */
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                How would you like to study this?
              </h2>
              <p className="text-sm text-muted-foreground">
                Select one or more learning methods and AIDA will present this material in your preferred way. You can switch at any time.
              </p>
            </div>

            <LearningMethodPicker
              selected={selectedMethods}
              onChange={handleMethodSelect}
              multiSelect
            />

            {selectedMethods.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="start-learning-btn"
                  onClick={handleStartLearning}
                  disabled={savingPrefs}
                  className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  <Sparkles className="size-4" />
                  {savingPrefs ? "Saving…" : "Start Learning"}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedMethods.length} method{selectedMethods.length > 1 ? "s" : ""} selected
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Active presentation screen */
          <div className="flex flex-col gap-5">
            {/* Method switcher header */}
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">
                  Studying with:{" "}
                  <strong className="text-foreground">
                    {LEARNING_METHODS.find((m) => m.value === activePresentationMethod)?.label}
                  </strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Switch methods anytime — your progress is not lost.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LearningMethodQuickSwitcher
                  current={activePresentationMethod}
                  onChange={(m) => setActivePresentationMethod(m)}
                />
                <button
                  type="button"
                  onClick={() => setActivePresentationMethod(null)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                >
                  ← Back
                </button>
              </div>
            </div>

            {/* Selected method pill list (if multiple selected) */}
            {selectedMethods.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {selectedMethods.map((m) => {
                  const meta = LEARNING_METHODS.find((x) => x.value === m);
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setActivePresentationMethod(m)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        activePresentationMethod === m
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                          : "border-border bg-card text-muted-foreground hover:border-brand-300 hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Adapted presentation content */}
            <AdaptedPresentationView
              topicId={topic.id}
              method={activePresentationMethod}
              onMethodChange={setActivePresentationMethod}
            />

            {/* Preferences saved notice */}
            {prefsSaved && (
              <p className="text-xs text-brand-600 dark:text-brand-400">
                ✓ Learning preferences saved to your profile.
              </p>
            )}
          </div>
        )}
      </TabsPanel>

      {/* Mind Map */}
      <TabsPanel value="mindmap">
        <MindMap
          data={topic.mindMap}
          onNodeSelect={(anchor) => {
            setTab("notes");
            requestAnimationFrame(() => {
              document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
        />
      </TabsPanel>

      {/* Quiz */}
      <TabsPanel value="quiz">
        <QuizRunner topicId={topic.id} documentId={topic.documentId} />
      </TabsPanel>

      {/* Tutor */}
      <TabsPanel value="tutor">
        <TutorChat
          documentId={topic.documentId}
          documentTitle={documentTitle}
          topicId={topic.id}
          topicTitle={topic.title}
          topics={topics}
        />
      </TabsPanel>
    </Tabs>
  );
}
