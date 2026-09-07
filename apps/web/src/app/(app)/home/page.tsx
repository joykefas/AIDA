import Link from "next/link";
import { CalendarClock, FileText } from "lucide-react";
import { UploadSheet } from "@/components/upload-sheet";
import { ReviewSignalBadge } from "@/components/review-signal-badge";
import { serverFetch } from "@/lib/api";
import type { DocumentListItem, ReviewQueueItem } from "@aida/shared";
import { ProcessingStatus } from "@aida/shared";

export default async function HomePage() {
  const [documents, due] = await Promise.all([
    serverFetch<DocumentListItem[]>("/documents"),
    serverFetch<ReviewQueueItem[]>("/review/due"),
  ]);

  const processing = documents.filter(
    (d) => d.status === ProcessingStatus.PENDING || d.status === ProcessingStatus.PROCESSING,
  );

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          What are we studying today?
        </h1>
        <p className="mt-1 text-muted-foreground">Upload something new, or pick up where you left off.</p>
      </div>

      <UploadSheet />

      {processing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Processing</h2>
          {processing.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <FileText className="size-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.status === ProcessingStatus.PENDING ? "Queued…" : "Generating notes, mind map, and quiz…"}
                </p>
              </div>
              <span className="size-2 animate-pulse rounded-full bg-brand-600" />
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Due today</h2>
          <Link href="/review" className="text-sm text-brand-600 hover:underline">
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
                    <p className="text-xs text-muted-foreground">{item.documentTitle}</p>
                  )}
                </div>
                <ReviewSignalBadge signal={item.signal} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
