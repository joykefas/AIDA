"use client";

import { Suspense } from "react";
import { WhatsAppTutorView } from "@/components/whatsapp-tutor-view";
import { RefreshCw } from "lucide-react";

export default function TutorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100svh-6rem)] w-full items-center justify-center rounded-2xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-6 animate-spin text-brand-600" />
            <span>Loading AIDA Tutor…</span>
          </div>
        </div>
      }
    >
      <div className="-mx-4 -my-6 sm:-mx-8 sm:-my-8 h-[calc(100svh-3.5rem)] sm:h-svh p-2 sm:p-4 flex flex-col">
        <WhatsAppTutorView />
      </div>
    </Suspense>
  );
}
