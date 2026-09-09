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
  Zap,
  Cpu,
  TrendingUp,
  BookOpen,
  BarChart3,
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
        <h3 className="font-heading font-semibold">Overview Restricted</h3>
        <p className="mt-1 text-sm">
          {error || "Could not retrieve admin overview data. If you have the Support role, you can access user management and inquiries below."}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            Go to Users &amp; Consent
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/admin/contact"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Go to Inquiries
          </Link>
        </div>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <span className="text-xs font-medium text-muted-foreground">Est. AI Spend (Groq / Cloudflare)</span>
            <Zap className="size-4 text-amber-500" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold">
            ${stats.estimatedSpendUsd !== undefined ? stats.estimatedSpendUsd.toFixed(2) : "0.00"}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="size-3.5 text-muted-foreground" />
            <span>
              ~{stats.estimatedTokensUsed ? Math.round(stats.estimatedTokensUsed / 1000) : 0}k tokens processed
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">BullMQ Queue Depth</span>
            <Clock className="size-4 text-brand-600" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold">
            {stats.queueMetrics?.waiting ?? 0}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {stats.queueMetrics?.active ?? 0} active, {stats.queueMetrics?.completed ?? 0} completed
            </span>
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
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">Document Ingestion Pipeline Health</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time status of extraction, semantic chunking, and embedding generation across all documents.
              </p>
            </div>
            {stats.averageTimeToReadySeconds !== undefined && (
              <div className="flex flex-col items-end gap-0.5 ml-4 shrink-0">
                <span className="text-xs text-muted-foreground">Avg. Time-to-Ready</span>
                <span className="font-heading text-lg font-bold text-emerald-600">
                  {stats.averageTimeToReadySeconds < 60
                    ? `${stats.averageTimeToReadySeconds}s`
                    : `${Math.round(stats.averageTimeToReadySeconds / 60)}m`}
                </span>
              </div>
            )}
          </div>

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
                <span className="text-sm font-medium">User Directory &amp; Consent</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/quality"
              className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-4 text-amber-500" />
                <span className="text-sm font-medium">Quality, Disputes &amp; Failures</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/compliance"
              className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span className="text-sm font-medium">GDPR &amp; Audit Trail</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/contact"
              className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="size-4 text-purple-600" />
                <span className="text-sm font-medium">Contact Inquiries</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Usage & Spaced Repetition Adherence */}
      {stats.featureUsage && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">Feature Usage &amp; Learning Adherence</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Platform-wide activity breakdown and spaced-repetition compliance.
              </p>
            </div>
            {stats.spacedRepetitionAdherenceRate !== undefined && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted-foreground">SR Adherence Rate</span>
                <span
                  className={`font-heading text-2xl font-bold ${
                    stats.spacedRepetitionAdherenceRate >= 70 ? "text-emerald-600" : "text-amber-500"
                  }`}
                >
                  {stats.spacedRepetitionAdherenceRate}%
                </span>
              </div>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Uploads", value: stats.featureUsage.uploads, icon: FileText },
              { label: "Tutor Chats", value: stats.featureUsage.tutorChats, icon: MessageSquare },
              { label: "Quizzes Taken", value: stats.featureUsage.quizzesTaken, icon: HelpCircle },
              { label: "Exams Taken", value: stats.featureUsage.examsTaken, icon: BookOpen },
              { label: "Reviews Done", value: stats.featureUsage.reviewsCompleted, icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-4 text-center"
              >
                <Icon className="size-4 text-muted-foreground" />
                <p className="font-heading text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Spend Breakdown Table */}
      {stats.dailySpend && stats.dailySpend.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-brand-600" />
            <h2 className="font-heading text-lg font-semibold">7-Day AI Spend &amp; Volume</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily token consumption and estimated cost over the past week.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4 text-right">Tokens</th>
                  <th className="pb-2 pr-4 text-right">Est. Spend</th>
                  <th className="pb-2 pr-4 text-right">Uploads</th>
                  <th className="pb-2 pr-4 text-right">Tutor Msgs</th>
                  <th className="pb-2 text-right">Quizzes</th>
                </tr>
              </thead>
              <tbody>
                {stats.dailySpend.map((day) => (
                  <tr key={day.date} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{day.date}</td>
                    <td className="py-2.5 pr-4 text-right">{day.tokensUsed.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right text-amber-600">${day.spendUsd.toFixed(4)}</td>
                    <td className="py-2.5 pr-4 text-right">{day.documentCount}</td>
                    <td className="py-2.5 pr-4 text-right">{day.tutorMessageCount}</td>
                    <td className="py-2.5 text-right">{day.quizCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Cost Outlier Users */}
      {stats.userOutliers && stats.userOutliers.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            <h2 className="font-heading text-lg font-semibold">Top AI Cost Outliers</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Top 5 accounts by estimated AI token consumption.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4 text-right">Est. Tokens</th>
                  <th className="pb-2 pr-4 text-right">Est. Spend</th>
                  <th className="pb-2 pr-4 text-right">Docs</th>
                  <th className="pb-2 pr-4 text-right">Msgs</th>
                  <th className="pb-2 text-right">Quizzes</th>
                </tr>
              </thead>
              <tbody>
                {stats.userOutliers.map((u, i) => (
                  <tr key={u.userId} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="max-w-[160px] truncate font-medium">{u.userEmail}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right">{u.estimatedTokens.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right font-medium text-amber-600">${u.estimatedSpendUsd.toFixed(4)}</td>
                    <td className="py-2.5 pr-4 text-right">{u.documentCount}</td>
                    <td className="py-2.5 pr-4 text-right">{u.messageCount}</td>
                    <td className="py-2.5 text-right">{u.quizCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
