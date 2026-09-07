"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, BarChart3, Users, CheckSquare, FileText } from "lucide-react";
import { cn } from "cn";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/admin/users", label: "Users & Consent", icon: Users },
  { href: "/admin/quality", label: "Grading & Disputes", icon: CheckSquare },
  { href: "/admin/compliance", label: "Compliance & Audit", icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight">Admin Console</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
              <ShieldAlert className="size-3" /> Privileged Access
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform operations, ingestion pipelines, AI grading evaluation & GDPR audit records.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
