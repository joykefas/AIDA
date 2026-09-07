"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { clientFetch } from "@/lib/api-client";
import type { AdminOverviewStats } from "@aida/shared";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientFetch<AdminOverviewStats>("/admin/overview")
      .then(setStats)
      .catch((err) => {
        setError(err.message || "Failed to load overview stats. Make sure you have Admin or Support permissions.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading admin overview metrics…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-danger-900 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-200">
        <h3 className="font-heading font-semibold">Access restricted or failed</h3>
        <p className="mt-1 text-sm">{error || "Could not retrieve admin data."}</p>
      </div>
    );
  }

  const processingPct =
    stats.totalDocuments > 0 ? Math.round((stats.documentsProcessing / stats.totalDocuments) * 100) : 0;
  const readyPct =
    stats.totalDocuments > 0 ? Math.round((stats.documentsReady / stats.totalDocuments) * 100) : 0;
  const failedPct =
    stats.totalDocuments > 0 ? Math.round((stats.documentsFailed / stats.totalDocuments) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Top metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Accounts</span>
            <Users className="size-4 text-brand-600" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold">{stats.totalUsers}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-brand-600" />
            <span>{stats.minorUsers} registered minors</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Documents Ingested</span>
            <FileText className="size-4 text-brand-600" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold">{stats.totalDocuments}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success-600" />
            <span>{stats.documentsReady} ready for learning</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Quizzes Evaluated</span>
            <HelpCircle className="size-4 text-brand-600" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold">{stats.totalQuizzesTaken}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5 text-brand-600" />
            <span>{stats.totalTutorMessages} tutor answers served</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Disputes</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold text-amber-600 dark:text-amber-400">
            {stats.activeDisputes}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href="/admin/quality"
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              Review contested grades &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Pipeline Health Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold">Document Ingestion Pipeline Health</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time status of extraction, semantic chunking, and embedding generation across all documents.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {/* Visual multi-segmented bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex">
              <div
                style={{ width: `${readyPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Ready: ${stats.documentsReady} (${readyPct}%)`}
              />
              <div
                style={{ width: `${processingPct}%` }}
                className="bg-amber-400 transition-all duration-500"
                title={`Processing: ${stats.documentsProcessing} (${processingPct}%)`}
              />
              <div
                style={{ width: `${failedPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Failed: ${stats.documentsFailed} (${failedPct}%)`}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Ready</p>
                  <p className="font-heading text-lg font-semibold">{stats.documentsReady}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                <Clock className="size-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="font-heading text-lg font-semibold">{stats.documentsProcessing}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                <XCircle className="size-5 text-rose-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="font-heading text-lg font-semibold">{stats.documentsFailed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold">Operational Actions</h2>
          <p className="text-sm text-muted-foreground">Frequently accessed administrative functions.</p>

          <div className="mt-2 flex flex-col gap-2">
            <Link
              href="/admin/users"
              className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <Users className="size-4 text-brand-600" />
                <span className="text-sm font-medium">User Directory & Minors</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/quality"
              className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-4 text-amber-500" />
                <span className="text-sm font-medium">Contested Quiz Grading</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/compliance"
              className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span className="text-sm font-medium">GDPR & Audit Trail</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
