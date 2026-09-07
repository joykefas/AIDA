import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger-600/30 bg-danger-100 p-3 text-sm text-danger-900 dark:border-danger-600/40 dark:bg-danger-900/20 dark:text-danger-100">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
