import { HomeStudyDashboard } from "@/components/home-study-dashboard";
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

  return <HomeStudyDashboard initialProcessing={processing} due={due} />;
}

