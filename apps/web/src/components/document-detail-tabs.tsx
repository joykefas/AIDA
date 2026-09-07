"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel } from "@/components/ui/tabs";
import { MindMap } from "@/components/mind-map";
import { QuizRunner } from "@/components/quiz-runner";
import { TutorChat } from "@/components/tutor-chat";
import type { TopicDetail } from "@aida/shared";

export function DocumentDetailTabs({ topic }: { topic: TopicDetail }) {
  const [tab, setTab] = useState("summary");

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
      <TabsList>
        <TabsIndicator />
        <TabsTab value="summary">Summary</TabsTab>
        <TabsTab value="notes">Notes</TabsTab>
        <TabsTab value="mindmap">Mind Map</TabsTab>
        <TabsTab value="quiz">Quiz</TabsTab>
        <TabsTab value="tutor">Ask Tutor</TabsTab>
      </TabsList>

      <TabsPanel value="summary">
        <p className="text-pretty leading-relaxed text-foreground">{topic.summary}</p>
      </TabsPanel>

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

      <TabsPanel value="quiz">
        <QuizRunner topicId={topic.id} documentId={topic.documentId} />
      </TabsPanel>

      <TabsPanel value="tutor">
        <TutorChat topicId={topic.id} topicTitle={topic.title} />
      </TabsPanel>
    </Tabs>
  );
}
