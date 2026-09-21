"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Mic,
  Link2,
  Type,
  Library as LibraryIcon,
} from "lucide-react";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { DocType, ProcessingStatus, type DocumentListItem } from "@aida/shared";

const TYPE_ICON: Record<DocType, typeof FileText> = {
  [DocType.PDF]: FileText,
  [DocType.DOCX]: FileText,
  [DocType.AUDIO]: Mic,
  [DocType.YOUTUBE]: Link2,
  [DocType.TEXT]: Type,
};

export function LibraryDocumentList({
  initialDocuments,
}: {
  initialDocuments: DocumentListItem[];
}) {
  const [documents, setDocuments] = useState<DocumentListItem[]>(initialDocuments);

  function handleDeleted(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
        <LibraryIcon className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">Nothing here yet.</p>
        <Link href="/home" className="text-sm font-medium text-brand-600 hover:underline">
          Upload your first document
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => {
        const Icon = TYPE_ICON[doc.type] ?? FileText;
        const isFailed = doc.status === ProcessingStatus.FAILED;

        return (
          <div
            key={doc.id}
            className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-800"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/library/${doc.id}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:scale-105 dark:bg-brand-950 dark:text-brand-300"
              >
                <Icon className="size-4.5" />
              </Link>
              <div className="flex items-center gap-2">
                <DocumentStatusBadge status={doc.status} />
                <DeleteDocumentButton
                  documentId={doc.id}
                  documentTitle={doc.title}
                  onDeleted={() => handleDeleted(doc.id)}
                />
              </div>
            </div>

            <Link href={`/library/${doc.id}`} className="block">
              <p className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {doc.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isFailed ? (
                  <span className="text-destructive">
                    Processing failed • Click for details
                  </span>
                ) : (
                  <span>
                    {doc.topicCount} topic{doc.topicCount === 1 ? "" : "s"}
                  </span>
                )}
              </p>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
