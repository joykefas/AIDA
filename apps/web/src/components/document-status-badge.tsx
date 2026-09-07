import { ProcessingStatus } from "@aida/shared";
import { cn } from "cn";

const CONFIG: Record<ProcessingStatus, { label: string; className: string }> = {
  [ProcessingStatus.PENDING]: { label: "Queued", className: "bg-muted text-muted-foreground" },
  [ProcessingStatus.PROCESSING]: {
    label: "Processing",
    className: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200",
  },
  [ProcessingStatus.READY]: {
    label: "Ready",
    className: "bg-success-100 text-success-900 dark:bg-success-900/30 dark:text-success-100",
  },
  [ProcessingStatus.FAILED]: {
    label: "Failed",
    className: "bg-danger-100 text-danger-900 dark:bg-danger-900/30 dark:text-danger-100",
  },
};

export function DocumentStatusBadge({ status }: { status: ProcessingStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", className)}>
      {label}
    </span>
  );
}
