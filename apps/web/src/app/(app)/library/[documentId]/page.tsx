import { AlertTriangle, Loader2 } from "lucide-react";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { DocumentDetailTabs } from "@/components/document-detail-tabs";
import { serverFetch } from "@/lib/api";
import { ProcessingStatus, type DocumentDetail, type TopicDetail } from "@aida/shared";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = await serverFetch<DocumentDetail>(`/documents/${documentId}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <DocumentStatusBadge status={document.status} />
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{document.title}</h1>
      </div>

      {document.status === ProcessingStatus.READY && document.topics[0] ? (
        <DocumentBody topicId={document.topics[0].id} />
      ) : document.status === ProcessingStatus.FAILED ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-danger-600/40 bg-danger-100 py-16 text-center dark:bg-danger-900/20">
          <AlertTriangle className="size-8 text-danger-600" />
          <p className="max-w-sm text-sm text-danger-900 dark:text-danger-100">
            {document.failureReason ?? "Something went wrong processing this file."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Loader2 className="size-8 animate-spin text-brand-600" />
          <p className="text-sm text-muted-foreground">
            Generating notes, mind map, and quiz. This usually takes a couple of minutes.
          </p>
        </div>
      )}
    </div>
  );
}

async function DocumentBody({ topicId }: { topicId: string }) {
  const topic = await serverFetch<TopicDetail>(`/topics/${topicId}`);
  return <DocumentDetailTabs topic={topic} />;
}
