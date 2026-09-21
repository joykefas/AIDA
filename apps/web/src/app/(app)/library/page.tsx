import { LibraryDocumentList } from "@/components/library-document-list";
import { serverFetch } from "@/lib/api";
import type { DocumentListItem } from "@aida/shared";

export default async function LibraryPage() {
  const documents = await serverFetch<DocumentListItem[]>("/documents");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Library</h1>
        <p className="mt-1 text-muted-foreground">Everything you&apos;ve uploaded, in one place.</p>
      </div>

      <LibraryDocumentList initialDocuments={documents} />
    </div>
  );
}
