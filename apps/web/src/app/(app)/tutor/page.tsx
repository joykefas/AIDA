"use client";

import { useState } from "react";
import { TutorChat } from "@/components/tutor-chat";
import {
  TutorScopePicker,
  type TutorScopeValue,
} from "@/components/tutor-scope-picker";

export default function TutorPage() {
  const [scope, setScope] = useState<TutorScopeValue>({
    documentId: null,
    documentTitle: null,
    topicId: null,
    topicTitle: null,
    topics: [],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Tutor
        </h1>
        <p className="mt-1 text-muted-foreground">
          Grounded in your own material, not a generic search. Select a material
          to start an isolated study conversation, then differentiate topics
          within it.
        </p>
      </div>

      <TutorChat
        documentId={scope.documentId ?? undefined}
        documentTitle={scope.documentTitle ?? undefined}
        topicId={scope.topicId ?? undefined}
        topicTitle={scope.topicTitle ?? undefined}
        topics={scope.topics}
        header={<TutorScopePicker value={scope} onChange={setScope} />}
      />
    </div>
  );
}
