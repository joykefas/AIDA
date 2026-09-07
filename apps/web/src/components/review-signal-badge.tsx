import { AlertTriangle, Clock } from "lucide-react";
import { ReviewSignal } from "@aida/shared";
import { cn } from "cn";

const CONFIG: Record<ReviewSignal, { label: string; className: string; icon?: typeof Clock }> = {
  [ReviewSignal.NEEDS_REVIEW]: {
    label: "Needs review",
    className: "bg-review-100 text-review-900 dark:bg-review-900/30 dark:text-review-100",
    icon: AlertTriangle,
  },
  [ReviewSignal.DUE]: {
    label: "Due",
    className: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200",
    icon: Clock,
  },
  [ReviewSignal.NOT_DUE]: {
    label: "Not due",
    className: "bg-muted text-muted-foreground",
  },
};

export function ReviewSignalBadge({ signal }: { signal: ReviewSignal }) {
  const { label, className, icon: Icon } = CONFIG[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      {Icon && <Icon className="size-3" />}
      {label}
    </span>
  );
}
