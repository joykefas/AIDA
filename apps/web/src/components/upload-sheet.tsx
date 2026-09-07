"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Mic, Link2, Type, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "cn";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import { DocType, ProcessingStatus, type DocumentDetail } from "@aida/shared";

type Mode = DocType;

const MODES: { value: Mode; label: string; icon: typeof FileText; hint: string }[] = [
  { value: DocType.PDF, label: "File", icon: FileText, hint: "PDF, up to 50MB" },
  { value: DocType.AUDIO, label: "Record", icon: Mic, hint: "Lecture or voice note" },
  { value: DocType.YOUTUBE, label: "YouTube", icon: Link2, hint: "Paste a link" },
  { value: DocType.TEXT, label: "Type", icon: Type, hint: "Your own notes" },
];

const POLL_INTERVAL_MS = 3000;

export function UploadSheet({ onUploaded }: { onUploaded?: (documentId: string) => void }) {
  const [mode, setMode] = useState<Mode>(DocType.PDF);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<DocumentDetail | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pollUntilDone(documentId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const doc = await clientFetch<DocumentDetail>(`/documents/${documentId}`);
        if (doc.status === ProcessingStatus.READY) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("idle");
          setReady(doc);
        } else if (doc.status === ProcessingStatus.FAILED) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("error");
          setError(doc.failureReason ?? "Processing failed. Try again.");
        }
      } catch {
        // A transient poll failure isn't worth surfacing — the next tick retries.
      }
    }, POLL_INTERVAL_MS);
  }

  const canSubmit =
    (mode === DocType.PDF || mode === DocType.AUDIO ? !!file : true) &&
    (mode === DocType.YOUTUBE ? sourceUrl.trim().length > 0 : true) &&
    (mode === DocType.TEXT ? textContent.trim().length > 0 : true);

  async function handleSubmit() {
    setStatus("uploading");
    setError(null);
    try {
      const form = new FormData();
      form.append("type", mode);
      if (title) form.append("title", title);
      if (mode === DocType.YOUTUBE) form.append("sourceUrl", sourceUrl);
      if (mode === DocType.TEXT) form.append("textContent", textContent);
      if (file) form.append("file", file);

      const result = await clientFetch<{ id: string; status: string }>("/documents", {
        method: "POST",
        body: form,
      });
      setStatus("processing");
      onUploaded?.(result.id);
      pollUntilDone(result.id);
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiClientError ? err.message : "Upload failed. Try again.");
    }
  }

  function resetForm() {
    setMode(DocType.PDF);
    setFile(null);
    setSourceUrl("");
    setTextContent("");
    setTitle("");
    setStatus("idle");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-4 gap-2">
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setStatus("idle");
              setError(null);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition active:scale-95",
              mode === value
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:bg-accent/30 hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>

      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {(mode === DocType.PDF || mode === DocType.AUDIO) && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/20"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={mode === DocType.PDF ? "application/pdf" : "audio/*"}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <span className="font-medium text-foreground">{file.name}</span>
          ) : (
            <span>
              {mode === DocType.PDF ? "Click to choose a PDF" : "Click to choose an audio file"}
            </span>
          )}
        </div>
      )}

      {mode === DocType.YOUTUBE && (
        <Input
          placeholder="https://youtube.com/watch?v=…"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      )}

      {mode === DocType.TEXT && (
        <textarea
          className="min-h-32 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Paste or type your notes…"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
        />
      )}

      {status === "processing" ? (
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-950 dark:text-brand-200">
          <span className="size-2 animate-pulse rounded-full bg-brand-600" />
          Processing. We&apos;ll let you know when it&apos;s ready, you can leave this page.
        </div>
      ) : (
        <Button onClick={handleSubmit} disabled={!canSubmit || status === "uploading"}>
          {status === "uploading" ? "Uploading…" : "Upload"}
        </Button>
      )}

      {error && <FormError message={error} />}

      <Dialog open={!!ready} onOpenChange={(open) => !open && setReady(null)}>
        <DialogContent>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-900/30">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <DialogTitle>Your notes are ready</DialogTitle>
              <DialogDescription>
                {ready?.title} has been turned into notes, a mind map, and a first quiz.
              </DialogDescription>
            </div>
            <div className="mt-2 flex w-full flex-col gap-2">
              {ready && (
                <Link href={`/library/${ready.id}`} className={cn(buttonVariants(), "w-full")}>
                  View it
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setReady(null);
                  resetForm();
                }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Upload another
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
