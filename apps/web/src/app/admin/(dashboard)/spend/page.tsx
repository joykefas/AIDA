"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Coins,
  Calculator,
  Search,
  Download,
  Zap,
  Cpu,
  Users,
  TrendingUp,
  FileText,
  MessageCircle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowUpDown,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientFetch } from "@/lib/api-client";
import type { AdminSpendSummary, AdminUserSpendItem } from "@aida/shared";
import { cn } from "cn";

export default function AdminSpendPage() {
  const [data, setData] = useState<AdminSpendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [minorFilter, setMinorFilter] = useState<"all" | "minor" | "adult">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin" | "support">("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"spend" | "tokens" | "documents" | "messages" | "quizzes" | "createdAt">("spend");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Interactive AI Spend Calculator & Simulator state
  const [showCalculator, setShowCalculator] = useState(true);
  const [simRate, setSimRate] = useState<number>(0.15); // $ / 1M tokens
  const [simTokensPerDoc, setSimTokensPerDoc] = useState<number>(3000);
  const [simTokensPerMsg, setSimTokensPerMsg] = useState<number>(1500);
  const [simTokensPerQuiz, setSimTokensPerQuiz] = useState<number>(1000);
  const [applySimulation, setApplySimulation] = useState(false);

  const fetchSpend = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (minorFilter === "minor") params.set("isMinor", "true");
    if (minorFilter === "adult") params.set("isMinor", "false");
    if (roleFilter !== "all") params.set("role", roleFilter.toUpperCase());
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    clientFetch<AdminSpendSummary>(`/admin/spend?${params.toString()}`)
      .then((res) => {
        setData(res);
        if (res.pricingRates?.costPerMillionTokens && simRate === 0.15) {
          setSimRate(res.pricingRates.costPerMillionTokens);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load user AI spend data");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpend();
  }, [search, minorFilter, roleFilter, sortBy, sortOrder]);

  // Simulated metrics and user items
  const processedUsers = useMemo(() => {
    if (!data?.users) return [];

    let list = data.users.map((u) => {
      if (!applySimulation) return u;

      const simDocTokens = u.documentCount * simTokensPerDoc;
      const simMsgTokens = u.messageCount * simTokensPerMsg;
      const simQuizTokens = u.quizCount * simTokensPerQuiz;
      const totalSimTokens = simDocTokens + simMsgTokens + simQuizTokens;
      const totalSimSpend = Number(((totalSimTokens / 1_000_000) * simRate).toFixed(4));

      return {
        ...u,
        estimatedTokens: totalSimTokens,
        estimatedSpendUsd: totalSimSpend,
        breakdown: {
          documentsTokens: simDocTokens,
          documentsSpendUsd: Number(((simDocTokens / 1_000_000) * simRate).toFixed(4)),
          messagesTokens: simMsgTokens,
          messagesSpendUsd: Number(((simMsgTokens / 1_000_000) * simRate).toFixed(4)),
          quizzesTokens: simQuizTokens,
          quizzesSpendUsd: Number(((simQuizTokens / 1_000_000) * simRate).toFixed(4)),
        },
      };
    });

    if (activeOnly) {
      list = list.filter((u) => u.estimatedTokens > 0);
    }

    if (applySimulation) {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      list.sort((a, b) => {
        if (sortBy === "tokens") return (a.estimatedTokens - b.estimatedTokens) * multiplier;
        if (sortBy === "documents") return (a.documentCount - b.documentCount) * multiplier;
        if (sortBy === "messages") return (a.messageCount - b.messageCount) * multiplier;
        if (sortBy === "quizzes") return (a.quizCount - b.quizCount) * multiplier;
        return (a.estimatedSpendUsd - b.estimatedSpendUsd) * multiplier;
      });
    }

    return list;
  }, [data?.users, applySimulation, simRate, simTokensPerDoc, simTokensPerMsg, simTokensPerQuiz, activeOnly, sortBy, sortOrder]);

  // Aggregate stats (taking simulation into account if active)
  const stats = useMemo(() => {
    if (!data) return { totalSpend: 0, totalTokens: 0, activeUsers: 0, avgSpend: 0 };
    if (!applySimulation) {
      return {
        totalSpend: data.totalSpendUsd,
        totalTokens: data.totalTokensUsed,
        activeUsers: data.activeAiUsersCount,
        avgSpend: data.averageSpendPerUser,
      };
    }

    const totalSpend = processedUsers.reduce((sum, u) => sum + u.estimatedSpendUsd, 0);
    const totalTokens = processedUsers.reduce((sum, u) => sum + u.estimatedTokens, 0);
    const activeUsers = processedUsers.filter((u) => u.estimatedTokens > 0).length;
    const avgSpend = processedUsers.length > 0 ? totalSpend / processedUsers.length : 0;

    return {
      totalSpend: Number(totalSpend.toFixed(4)),
      totalTokens,
      activeUsers,
      avgSpend: Number(avgSpend.toFixed(4)),
    };
  }, [data, applySimulation, processedUsers]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!processedUsers.length) return;
    const headers = [
      "User ID",
      "Email",
      "Display Name",
      "Role",
      "Is Minor",
      "Documents Ingested",
      "Doc Tokens",
      "Tutor Messages",
      "Message Tokens",
      "Quizzes Taken",
      "Quiz Tokens",
      "Total Estimated Tokens",
      "Estimated Spend (USD)",
      "Registered At",
    ];

    const rows = processedUsers.map((u) => [
      u.userId,
      u.userEmail,
      u.displayName ?? "",
      u.role,
      u.isMinor ? "Yes" : "No",
      u.documentCount,
      u.breakdown.documentsTokens,
      u.messageCount,
      u.breakdown.messagesTokens,
      u.quizCount,
      u.breakdown.quizzesTokens,
      u.estimatedTokens,
      u.estimatedSpendUsd.toFixed(4),
      u.createdAt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aida-user-spend-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSortToggle = (column: "spend" | "tokens" | "documents" | "messages" | "quizzes" | "createdAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Coins className="size-6 text-amber-500" />
            <h1 className="font-heading text-2xl font-bold tracking-tight">User AI Spend &amp; Costs</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit LLM token usage, calculate spend per user account, and model cost projections across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSpend}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            disabled={!processedUsers.length}
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total AI Spend</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-heading text-3xl font-bold text-foreground">
            ${stats.totalSpend.toFixed(2)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="size-3.5 text-amber-500" />
            <span>{stats.totalTokens.toLocaleString()} tokens total</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active AI Users</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-heading text-3xl font-bold text-foreground">
            {stats.activeUsers}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {data?.totalUsersCount ?? 0}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-emerald-500" />
            <span>
              {data?.totalUsersCount
                ? Math.round((stats.activeUsers / data.totalUsersCount) * 100)
                : 0}
              % participation rate
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Avg. Spend / User</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-heading text-3xl font-bold text-foreground">
            ${stats.avgSpend.toFixed(4)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              ~{data?.totalUsersCount ? Math.round(stats.totalTokens / data.totalUsersCount) : 0} tokens/account
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Rate Model</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Sparkles className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-foreground">
            ${applySimulation ? simRate.toFixed(2) : (data?.pricingRates?.costPerMillionTokens ?? 0.15).toFixed(2)}
            <span className="text-xs font-normal text-muted-foreground"> / 1M tok</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                applySimulation
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {applySimulation ? "Custom Simulation" : "Cloudflare / Groq Blend"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive AI Spend Calculator & Scenario Simulator */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div
          className="flex items-center justify-between p-5 cursor-pointer select-none bg-muted/20 hover:bg-muted/30 transition-colors"
          onClick={() => setShowCalculator((prev) => !prev)}
        >
          <div className="flex items-center gap-2.5">
            <Calculator className="size-5 text-brand-600" />
            <div>
              <h2 className="font-heading text-base font-semibold">Interactive AI Spend Calculator &amp; Simulator</h2>
              <p className="text-xs text-muted-foreground">
                Tweak token weights and pricing rates to project live platform costs or test alternative provider tiers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {applySimulation && (
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                Simulation Active
              </span>
            )}
            {showCalculator ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </div>

        {showCalculator && (
          <div className="p-6 border-t border-border flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Rate per 1M tokens */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Rate ($ / 1M tokens)</label>
                  <span className="font-mono text-xs font-semibold text-brand-600">${simRate.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="2.00"
                  step="0.01"
                  value={simRate}
                  onChange={(e) => {
                    setSimRate(parseFloat(e.target.value));
                    setApplySimulation(true);
                  }}
                  className="accent-brand-600 w-full cursor-pointer"
                />
                <div className="flex items-center gap-1.5">
                  {[
                    { label: "Cloudflare", rate: 0.15 },
                    { label: "Groq 70B", rate: 0.69 },
                    { label: "Llama 8B", rate: 0.08 },
                    { label: "GPT-4o-mini", rate: 0.30 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSimRate(preset.rate);
                        setApplySimulation(true);
                      }}
                      className={cn(
                        "rounded border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        simRate === preset.rate
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                          : "border-border hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {preset.label} (${preset.rate})
                    </button>
                  ))}
                </div>
              </div>

              {/* Tokens per Document Upload */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Tokens / Document</label>
                  <span className="font-mono text-xs font-semibold text-brand-600">{simTokensPerDoc.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={simTokensPerDoc}
                  onChange={(e) => {
                    setSimTokensPerDoc(parseInt(e.target.value, 10));
                    setApplySimulation(true);
                  }}
                  className="accent-brand-600 w-full cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">Includes summary, topics, notes &amp; mind map generation.</p>
              </div>

              {/* Tokens per Tutor Chat */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Tokens / Tutor Message</label>
                  <span className="font-mono text-xs font-semibold text-brand-600">{simTokensPerMsg.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="250"
                  value={simTokensPerMsg}
                  onChange={(e) => {
                    setSimTokensPerMsg(parseInt(e.target.value, 10));
                    setApplySimulation(true);
                  }}
                  className="accent-brand-600 w-full cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">Includes RAG context chunk injection &amp; assistant response.</p>
              </div>

              {/* Tokens per Quiz Attempt */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Tokens / Quiz Grading</label>
                  <span className="font-mono text-xs font-semibold text-brand-600">{simTokensPerQuiz.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={simTokensPerQuiz}
                  onChange={(e) => {
                    setSimTokensPerQuiz(parseInt(e.target.value, 10));
                    setApplySimulation(true);
                  }}
                  className="accent-brand-600 w-full cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">Written-response rubric scoring and formative feedback.</p>
              </div>
            </div>

            {/* Scale Projection Table */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Projected Platform Spend at Scale
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={applySimulation ? "default" : "outline"}
                    size="sm"
                    onClick={() => setApplySimulation(!applySimulation)}
                    className="text-xs h-7"
                  >
                    {applySimulation ? "Simulation Active in Table" : "Apply to User Table"}
                  </Button>
                  {applySimulation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setApplySimulation(false);
                        setSimRate(data?.pricingRates?.costPerMillionTokens ?? 0.15);
                        setSimTokensPerDoc(3000);
                        setSimTokensPerMsg(1500);
                        setSimTokensPerQuiz(1000);
                      }}
                      className="text-xs h-7 text-muted-foreground"
                    >
                      Reset Defaults
                    </Button>
                  )}
                </div>
              </div>

              {/* Monthly Cost Matrix at Scale */}
              {(() => {
                const avgTokensPerActiveUser =
                  stats.activeUsers > 0 ? stats.totalTokens / stats.activeUsers : 15000;
                const monthlyTiers = [100, 500, 1000, 5000, 25000];
                return (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
                    {monthlyTiers.map((students) => {
                      const projectedTokens = students * avgTokensPerActiveUser;
                      const projectedCost = (projectedTokens / 1_000_000) * simRate;
                      return (
                        <div key={students} className="rounded-lg border border-border bg-card p-2.5">
                          <p className="text-[11px] font-medium text-muted-foreground">{students.toLocaleString()} Students</p>
                          <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                            ${projectedCost.toFixed(2)}
                            <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            ~{Math.round(projectedTokens / 1_000_000)}M tokens
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* User Spend List Section */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
        {/* Controls Toolbar */}
        <div className="p-5 border-b border-border flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold">User Spend Breakdown ({processedUsers.length})</h2>
              <p className="text-xs text-muted-foreground">
                Showing all registered user accounts with activity tallies and calculated AI consumption.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              {/* Minor Filter */}
              <select
                value={minorFilter}
                onChange={(e) => setMinorFilter(e.target.value as "all" | "minor" | "adult")}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Accounts</option>
                <option value="minor">Minors Only (&lt;13)</option>
                <option value="adult">Adults Only</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | "student" | "admin" | "support")}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="admin">Admins</option>
                <option value="support">Support</option>
              </select>

              {/* Active AI Only Toggle */}
              <button
                type="button"
                onClick={() => setActiveOnly(!activeOnly)}
                className={cn(
                  "h-9 rounded-lg border px-3 text-xs font-medium transition-colors",
                  activeOnly
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-border hover:bg-muted text-muted-foreground",
                )}
              >
                {activeOnly ? "Active AI Only ✓" : "Active AI Only"}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                <th className="py-3 px-4">User</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSortToggle("documents")}
                >
                  <div className="inline-flex items-center gap-1">
                    Documents
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSortToggle("messages")}
                >
                  <div className="inline-flex items-center gap-1">
                    Tutor Chats
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSortToggle("quizzes")}
                >
                  <div className="inline-flex items-center gap-1">
                    Quizzes
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSortToggle("tokens")}
                >
                  <div className="inline-flex items-center gap-1">
                    Est. Tokens
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none font-semibold text-foreground"
                  onClick={() => handleSortToggle("spend")}
                >
                  <div className="inline-flex items-center gap-1">
                    Est. Spend (USD)
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Cost Breakdown</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSortToggle("createdAt")}
                >
                  <div className="inline-flex items-center gap-1">
                    Joined
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && processedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    <RefreshCw className="mx-auto size-6 animate-spin text-brand-600 mb-2" />
                    Loading spend data for all users…
                  </td>
                </tr>
              ) : processedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No users matching the selected filters found.
                  </td>
                </tr>
              ) : (
                processedUsers.map((u) => {
                  const totalTokens = u.estimatedTokens;
                  const docPct = totalTokens > 0 ? (u.breakdown.documentsTokens / totalTokens) * 100 : 0;
                  const msgPct = totalTokens > 0 ? (u.breakdown.messagesTokens / totalTokens) * 100 : 0;
                  const quizPct = totalTokens > 0 ? (u.breakdown.quizzesTokens / totalTokens) * 100 : 0;

                  return (
                    <tr key={u.userId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-xs">{u.userEmail}</span>
                            {u.isMinor && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                                <ShieldCheck className="size-3 text-amber-500" /> Minor
                              </span>
                            )}
                            <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-medium uppercase text-muted-foreground">
                              {u.role}
                            </span>
                          </div>
                          {u.displayName && (
                            <span className="text-[11px] text-muted-foreground">{u.displayName}</span>
                          )}
                        </div>
                      </td>

                      {/* Documents */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-foreground">{u.documentCount}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {u.breakdown.documentsTokens.toLocaleString()} tok
                        </div>
                      </td>

                      {/* Tutor Messages */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-foreground">{u.messageCount}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {u.breakdown.messagesTokens.toLocaleString()} tok
                        </div>
                      </td>

                      {/* Quizzes */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-foreground">{u.quizCount}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {u.breakdown.quizzesTokens.toLocaleString()} tok
                        </div>
                      </td>

                      {/* Total Tokens */}
                      <td className="py-3 px-4 text-right font-mono text-xs font-medium text-foreground">
                        {u.estimatedTokens.toLocaleString()}
                      </td>

                      {/* Total Spend */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={cn(
                            "inline-block font-mono text-xs font-bold px-2 py-0.5 rounded",
                            u.estimatedSpendUsd > 0.05
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : u.estimatedSpendUsd > 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground",
                          )}
                        >
                          ${u.estimatedSpendUsd.toFixed(4)}
                        </span>
                      </td>

                      {/* Visual Breakdown Bar */}
                      <td className="py-3 px-4 text-center">
                        {totalTokens > 0 ? (
                          <div className="flex h-2 w-28 mx-auto rounded-full overflow-hidden bg-muted">
                            <div
                              style={{ width: `${docPct}%` }}
                              title={`Documents: ${Math.round(docPct)}% ($${u.breakdown.documentsSpendUsd.toFixed(4)})`}
                              className="bg-brand-500"
                            />
                            <div
                              style={{ width: `${msgPct}%` }}
                              title={`Tutor Chat: ${Math.round(msgPct)}% ($${u.breakdown.messagesSpendUsd.toFixed(4)})`}
                              className="bg-amber-500"
                            />
                            <div
                              style={{ width: `${quizPct}%` }}
                              title={`Quizzes: ${Math.round(quizPct)}% ($${u.breakdown.quizzesSpendUsd.toFixed(4)})`}
                              className="bg-violet-500"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                        {new Date(u.createdAt).toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
