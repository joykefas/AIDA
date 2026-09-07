import { serverFetch } from "@/lib/api";
import { ExamRunner } from "@/components/exam-runner";
import type { DocumentDetail } from "@aida/shared";
import { notFound } from "next/navigation";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = await serverFetch<DocumentDetail>(`/documents/${documentId}`);

  if (!document || !document.topics[0]) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border pb-4">
        <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Exam Simulator</span>
        <h1 className="font-heading text-2xl font-bold tracking-tight mt-1">{document.title}</h1>
      </div>

      <ExamRunner topicId={document.topics[0].id} documentId={document.id} />
    </div>
  );
}
