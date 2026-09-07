"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, FileText, Trash2, Download, AlertCircle } from "lucide-react";
import { clientFetch } from "@/lib/api-client";
import type { AdminAuditLogItem } from "@aida/shared";
import { cn } from "cn";

export default function AdminCompliancePage() {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientFetch<AdminAuditLogItem[]>("/admin/compliance")
      .then(setLogs)
      .catch((err) => setError(err.message || "Failed to load compliance audit logs"))
      .finally(() => setLoading(false));
  }, []);

  function getActionBadge(action: string) {
    switch (action) {
      case "ACCOUNT_DELETED":
      case "USER_DELETED_BY_ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <Trash2 className="size-3" /> {action}
          </span>
        );
      case "DATA_EXPORTED":
      case "DATA_EXPORTED_BY_ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Download className="size-3" /> {action}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {action}
          </span>
        );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">GDPR Audit & Compliance Trail</h2>
        <p className="text-sm text-muted-foreground">
          Immutable records of data exports (Article 20) and account erasures (Article 17) for regulatory compliance.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-900 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor ID</th>
              <th className="px-4 py-3">Target User ID</th>
              <th className="px-4 py-3">Details / Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Loading audit logs…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No compliance actions logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {log.actorId}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {log.targetUserId || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.metadata ? (
                      <pre className="max-w-md truncate rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </pre>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
