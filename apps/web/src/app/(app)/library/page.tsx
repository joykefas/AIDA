import Link from "next/link";
import { FileText, Mic, Link2, Type, Library as LibraryIcon } from "lucide-react";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { serverFetch } from "@/lib/api";
import { DocType, type DocumentListItem } from "@aida/shared";

const TYPE_ICON: Record<DocType, typeof FileText> = {
  [DocType.PDF]: FileText,
  [DocType.AUDIO]: Mic,
  [DocType.YOUTUBE]: Link2,
  [DocType.TEXT]: Type,
};

export default async function LibraryPage() {
  const documents = await serverFetch<DocumentListItem[]>("/documents");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Library</h1>
        <p className="mt-1 text-muted-foreground">Everything you&apos;ve uploaded, in one place.</p>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <LibraryIcon className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Nothing here yet.</p>
          <Link href="/home" className="text-sm text-brand-600 hover:underline">
            Upload your first document
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const Icon = TYPE_ICON[doc.type];
            return (
              <Link
                key={doc.id}
                href={`/library/${doc.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:translate-y-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    <Icon className="size-4.5" />
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </div>
                <div>
                  <p className="line-clamp-2 font-medium">{doc.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {doc.topicCount} topic{doc.topicCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
