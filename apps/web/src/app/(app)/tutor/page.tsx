"use client";

import { Suspense } from "react";
import { WhatsAppTutorView } from "@/components/whatsapp-tutor-view";
import { RefreshCw } from "lucide-react";

export default function TutorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-6 animate-spin text-brand-600" />
            <span>Loading AIDA Tutor…</span>
          </div>
        </div>
      }
    >
      <div className="h-full w-full flex flex-col flex-1 min-w-0 overflow-hidden">
        <WhatsAppTutorView />
      </div>
    </Suspense>
  );
}
