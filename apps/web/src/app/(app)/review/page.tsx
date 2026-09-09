import { ReviewQueueView } from "@/components/review-queue-view";
import { serverFetch } from "@/lib/api";
import type { ReviewCalendarDay, ReviewQueueItem } from "@aida/shared";

export default async function ReviewPage() {
  const [due, calendar] = await Promise.all([
    serverFetch<ReviewQueueItem[]>("/review/due"),
    serverFetch<ReviewCalendarDay[]>("/review/calendar?days=14"),
  ]);

  return <ReviewQueueView due={due} calendar={calendar} />;
}

