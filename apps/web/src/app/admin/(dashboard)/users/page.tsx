"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Download,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  FileText,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/api-client";
import type { AdminUserListItem, UserDataExport } from "@aida/shared";
import { cn } from "cn";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [minorFilter, setMinorFilter] = useState<"all" | "minor" | "adult">("all");

  // Deletion modal state
  const [deletingUser, setDeletingUser] = useState<AdminUserListItem | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Export state
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (minorFilter === "minor") params.set("isMinor", "true");
    if (minorFilter === "adult") params.set("isMinor", "false");

    clientFetch<AdminUserListItem[]>(`/admin/users?${params.toString()}`)
      .then((data: AdminUserListItem[]) => {
        if (!ignore) {
          setUsers(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const message = err instanceof Error ? err.message : "Failed to load users";
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search, minorFilter, refreshKey]);

  async function handleExport(user: AdminUserListItem) {
    setExportingId(user.id);
    try {
      const data = await clientFetch<UserDataExport>(`/admin/users/${user.id}/export`, {
        method: "POST",
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-export-${user.email}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to export user data";
      alert(message);
    } finally {
      setExportingId(null);
    }
  }

  async function handleToggleConsent(user: AdminUserListItem) {
    try {
      const updated = await clientFetch<AdminUserListItem>(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ parentalConsentGiven: !user.parentalConsentGiven }),
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update parental consent status";
      alert(message);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingUser || confirmEmail !== deletingUser.email) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await clientFetch(`/admin/users/${deletingUser.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
      setConfirmEmail("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setRefreshKey((k) => k + 1);
          }}
          className="relative max-w-md flex-1"
        >
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search users by email or display name…"
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-xs">
          {(["all", "minor", "adult"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setMinorFilter(filter)}
              className={cn(
                "rounded-md px-3 py-1 font-medium capitalize transition-colors",
                minorFilter === filter
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter === "all" ? "All Users" : filter === "minor" ? "Minors Only" : "Adults Only"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-900 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-200">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Age / Consent</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Loading user records…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{u.displayName || "Anonymous"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                          : u.role === "SUPPORT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {u.isMinor ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                          <ShieldAlert className="size-3" /> Minor
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center gap-1 text-[11px] text-muted-foreground">
                          <UserCheck className="size-3" /> Adult
                        </span>
                      )}
                      {u.isMinor && (
                        <span className="text-[11px] text-muted-foreground">
                          Consent:{" "}
                          {u.parentalConsentGiven ? (
                            <span className="font-medium text-success-600">Verified</span>
                          ) : (
                            <span className="font-medium text-amber-600">Pending</span>
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1" title="Documents">
                        <FileText className="size-3.5 text-muted-foreground" />
                        {u.documentCount}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Quizzes taken">
                        <HelpCircle className="size-3.5 text-muted-foreground" />
                        {u.quizAttemptCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.isMinor && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "h-8 text-xs",
                            u.parentalConsentGiven
                              ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                          )}
                          onClick={() => handleToggleConsent(u)}
                          title={u.parentalConsentGiven ? "Revoke Parental Consent" : "Grant Parental Consent"}
                        >
                          <ShieldCheck className="size-3.5 mr-1" />
                          {u.parentalConsentGiven ? "Verified" : "Grant"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        disabled={exportingId === u.id}
                        onClick={() => handleExport(u)}
                        title="Export GDPR Data Archive"
                      >
                        <Download className="size-3.5 mr-1" />
                        {exportingId === u.id ? "Exporting…" : "Export"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                        onClick={() => {
                          setDeletingUser(u);
                          setConfirmEmail("");
                          setDeleteError(null);
                        }}
                        title="Permanently Delete Account"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete User Modal */}
      {deletingUser && (
        <Dialog open onOpenChange={(open: boolean) => !open && setDeletingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle className="flex items-center gap-2 text-danger-600">
              <AlertCircle className="size-5" /> Delete User Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{deletingUser.email}</strong>? This will purge all
              documents, chunks, embeddings, quizzes, and progress records immediately under GDPR right to erasure.
            </DialogDescription>

            <div className="mt-4 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                To confirm deletion, please type the user&apos;s email address below:
              </p>
              <Input
                value={confirmEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmEmail(e.target.value)}
                placeholder={deletingUser.email}
              />
              {deleteError && <p className="text-xs text-danger-600">{deleteError}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={confirmEmail !== deletingUser.email || isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
