"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import { cn } from "cn";

interface DeleteDocumentButtonProps {
  documentId: string;
  documentTitle: string;
  onDeleted?: () => void;
  variant?: "icon" | "button";
  redirectOnDelete?: boolean;
  className?: string;
}

export function DeleteDocumentButton({
  documentId,
  documentTitle,
  onDeleted,
  variant = "icon",
  redirectOnDelete = false,
  className,
}: DeleteDocumentButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    setError(null);
    try {
      await clientFetch<{ deleted: boolean }>(`/documents/${documentId}`, {
        method: "DELETE",
      });
      setOpen(false);
      onDeleted?.();
      if (redirectOnDelete) {
        router.push("/library");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to delete document. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={`Delete ${documentTitle}`}
          title="Delete material"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setError(null);
            setOpen(true);
          }}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95",
            className,
          )}
        >
          <Trash2 className="size-4" />
        </button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setError(null);
            setOpen(true);
          }}
          className={cn("gap-1.5", className)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => !isDeleting && setOpen(v)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <DialogTitle>Delete this material?</DialogTitle>
              <DialogDescription className="mt-1">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{documentTitle}&rdquo;
                </span>
                ? All notes, mind maps, quizzes, and spaced-repetition schedules
                will be permanently removed.
              </DialogDescription>
            </div>

            {error && (
              <p className="w-full rounded-lg bg-destructive/10 p-2 text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <div className="mt-3 flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1 gap-1.5"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
