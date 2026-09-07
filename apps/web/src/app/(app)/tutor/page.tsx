"use client";

import { useState } from "react";
import { TutorChat } from "@/components/tutor-chat";
import { TutorScopePicker } from "@/components/tutor-scope-picker";

export default function TutorPage() {
  const [scope, setScope] = useState<{ topicId: string | null; topicTitle: string | null }>({
    topicId: null,
    topicTitle: null,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Tutor</h1>
        <p className="mt-1 text-muted-foreground">Grounded in your own material, not a generic search.</p>
      </div>

      <TutorChat
        topicId={scope.topicId ?? undefined}
        topicTitle={scope.topicTitle ?? undefined}
        header={<TutorScopePicker value={scope} onChange={setScope} />}
      />
    </div>
  );
}
