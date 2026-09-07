"use client";

import { useRouter } from "next/navigation";
import { UploadSheet } from "@/components/upload-sheet";

export default function FirstUploadPage() {
  const router = useRouter();

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Bring in your first material
        </h1>
        <p className="text-muted-foreground">
          A PDF, a recording, a YouTube link, or notes you already have. This is the fastest way to
          see what AIDA does with it.
        </p>
      </div>

      <UploadSheet onUploaded={() => router.push("/home")} />

      <button
        type="button"
        onClick={() => router.push("/home")}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        I&apos;ll do this later
      </button>
    </div>
  );
}
