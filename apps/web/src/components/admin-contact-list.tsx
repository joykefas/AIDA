"use client";

import { useState } from "react";
import { Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/api-client";
import type { ContactSubmissionDto } from "@aida/shared";

export function AdminContactList({ initial }: { initial: ContactSubmissionDto[] }) {
  const [submissions, setSubmissions] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);

  async function markRead(id: string) {
    setPending(id);
    try {
      await clientFetch(`/contact/${id}/read`, { method: "PATCH" });
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, isRead: true } : s)));
    } finally {
      setPending(null);
    }
  }

  const unreadCount = submissions.filter((s) => !s.isRead).length;

  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{unreadCount === 0 ? "All caught up." : `${unreadCount} unread.`}</p>
      <div className="flex flex-col gap-2">
      {submissions.map((s) => (
        <div
          key={s.id}
          className={`flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${
            s.isRead ? "border-border bg-card" : "border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40"
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {s.isRead ? (
                <MailOpen className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Mail className="size-4 shrink-0 text-brand-600" />
              )}
              <span className="font-medium">{s.name}</span>
              <span className="text-sm text-muted-foreground">{s.email}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(s.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <p className="mt-2 text-sm text-pretty text-foreground">{s.message}</p>
          </div>
          {!s.isRead && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending === s.id}
              onClick={() => markRead(s.id)}
              className="shrink-0"
            >
              Mark read
            </Button>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
