"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { UploadSheet } from "@/components/upload-sheet";
import { ReviewSignalBadge } from "@/components/review-signal-badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { clientFetch } from "@/lib/api-client";
import { cn } from "cn";
import {
  ProcessingStatus,
  DocType,
  type DocumentListItem,
  type ReviewQueueItem,
  type DocumentDetail,
} from "@aida/shared";

interface HomeStudyDashboardProps {
  initialProcessing: DocumentListItem[];
  due: ReviewQueueItem[];
}

export function HomeStudyDashboard({
  initialProcessing,
  due,
}: HomeStudyDashboardProps) {
  const [processingDocs, setProcessingDocs] =
    useState<DocumentListItem[]>(initialProcessing);
  const [prevInitial, setPrevInitial] = useState(initialProcessing);
  const [finishedDoc, setFinishedDoc] = useState<DocumentDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Sync if server re-renders with new processing items
  if (initialProcessing !== prevInitial) {
    setPrevInitial(initialProcessing);
    const existingIds = new Set(processingDocs.map((d) => d.id));
    const newItems = initialProcessing.filter((d) => !existingIds.has(d.id));
    if (newItems.length > 0) {
      setProcessingDocs((prev) => [...prev, ...newItems]);
    }
  }

  // Polling loop for all currently processing documents
  useEffect(() => {
    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      for (const item of processingDocs) {
        try {
          const doc = await clientFetch<DocumentDetail>(`/documents/${item.id}`);
          if (
            doc.status === ProcessingStatus.READY ||
            doc.status === ProcessingStatus.FAILED
          ) {
            setProcessingDocs((prev) => prev.filter((d) => d.id !== item.id));
            setFinishedDoc(doc);
            router.refresh();
          }
        } catch {
          // Ignore transient polling failure; next tick will retry
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [processingDocs, router]);

  async function handleNewUpload(documentId: string) {
    try {
      const doc = await clientFetch<DocumentDetail>(`/documents/${documentId}`);
      setProcessingDocs((prev) => {
        if (prev.some((d) => d.id === documentId)) return prev;
        return [
          ...prev,
          {
            id: doc.id,
            title: doc.title,
            type: doc.type,
            status: doc.status,
            topicCount: doc.topics?.length ?? 0,
            createdAt: doc.createdAt,
          },
        ];
      });
    } catch {
      // If immediate fetch fails, add placeholder and let poller sync
      setProcessingDocs((prev) => [
        ...prev,
        {
          id: documentId,
          title: "Uploaded document",
          type: DocType.PDF,
          status: ProcessingStatus.PROCESSING,
          topicCount: 0,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  async function handleDeleteFailed(documentId: string) {
    setIsDeleting(true);
    try {
      await clientFetch(`/documents/${documentId}`, { method: "DELETE" });
      setFinishedDoc(null);
      router.refresh();
    } catch {
      setFinishedDoc(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          What are we studying today?
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload something new, or pick up where you left off.
        </p>
      </div>

      <UploadSheet onUploaded={handleNewUpload} />

      {/* Real-time Processing Section */}
      {processingDocs.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Processing ({processingDocs.length})
            </h2>
            <Loader2 className="size-3.5 animate-spin text-brand-600" />
          </div>
          {processingDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-sm shadow-xs transition"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <FileText className="size-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-foreground">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.status === ProcessingStatus.PENDING
                    ? "Queued for analysis…"
                    : "Generating notes, mind map, and quiz questions…"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                  In progress
                </span>
                <span className="size-2 animate-pulse rounded-full bg-brand-600" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Due Today Reviews Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Due today
          </h2>
          <Link
            href="/review"
            className="text-sm text-brand-600 hover:underline"
          >
            See all
          </Link>
        </div>
        {due.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            <CalendarClock className="size-6" />
            Nothing due yet. Upload material to start your review schedule.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {due.slice(0, 5).map((item) => (
              <Link
                key={item.topicId}
                href={`/library/${item.documentId}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:translate-y-0"
              >
                <div>
                  <p className="font-medium">{item.topicTitle}</p>
                  {item.documentTitle !== item.topicTitle && (
                    <p className="text-xs text-muted-foreground">
                      {item.documentTitle}
                    </p>
                  )}
                </div>
                <ReviewSignalBadge signal={item.signal} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Upload Outcome Notification Modal (Success & Failure) */}
      <Dialog
        open={!!finishedDoc}
        onOpenChange={(open) => !open && setFinishedDoc(null)}
      >
        <DialogContent>
          {finishedDoc?.status === ProcessingStatus.READY ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-900/30">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <DialogTitle>Your notes are ready!</DialogTitle>
                <DialogDescription className="mt-1">
                  <strong className="text-foreground">{finishedDoc.title}</strong>{" "}
                  has been analyzed and structured into notes, a concept mind map,
                  and an initial quiz.
                </DialogDescription>
              </div>
              <div className="mt-3 flex w-full flex-col gap-2">
                <Link
                  href={`/library/${finishedDoc.id}`}
                  onClick={() => setFinishedDoc(null)}
                  className={cn(buttonVariants(), "w-full gap-2")}
                >
                  <FileText className="size-4" />
                  Study Material Now
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFinishedDoc(null)}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : finishedDoc?.status === ProcessingStatus.FAILED ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <DialogTitle>Processing Failed</DialogTitle>
                <DialogDescription className="mt-1">
                  Could not process{" "}
                  <strong className="text-foreground">{finishedDoc.title}</strong>.
                </DialogDescription>
              </div>

              <div className="w-full rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-left text-xs font-mono text-destructive break-words">
                {finishedDoc.failureReason ??
                  "An unexpected error occurred while analyzing the document."}
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: If the document is an entire textbook, try uploading
                chapter-by-chapter for the best experience.
              </p>

              <div className="mt-3 flex w-full flex-col gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={() => handleDeleteFailed(finishedDoc.id)}
                  className="w-full gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" />
                      Delete &amp; Try Again
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setFinishedDoc(null)}
                  className="w-full"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
