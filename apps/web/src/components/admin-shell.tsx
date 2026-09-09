"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  BarChart3,
  Users,
  CheckSquare,
  FileText,
  MessageCircle,
  ShieldAlert,
  Menu,
  X
} from "lucide-react";
import { cn } from "cn";
import { LogoutButton } from "@/components/logout-button";
import { type UserProfile } from "@aida/shared";

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/admin/users", label: "Users & Consent", icon: Users },
  { href: "/admin/quality", label: "Quality & Diagnostics", icon: CheckSquare },
  { href: "/admin/compliance", label: "Compliance & Audit", icon: FileText },
  { href: "/admin/contact", label: "Contact Inquiries", icon: MessageCircle },
] as const;

export function AdminShell({ user, children }: { user: UserProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-svh sm:h-svh sm:overflow-hidden flex-col bg-background sm:flex-row">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 px-4 py-6 backdrop-blur-sm sm:flex sm:h-full">
        {/* Admin Header & Badge */}
        <div className="mb-6 flex items-center justify-between px-2">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/brand/light_logo_single.png" alt="AIDA" width={26} height={26} className="dark:hidden" />
            <Image src="/brand/dark_logo_single.png" alt="AIDA" width={26} height={26} className="hidden dark:block" />
            <span className="font-heading text-lg font-bold tracking-tight">AIDA</span>
          </Link>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-3 text-amber-500" /> Admin
          </span>
        </div>

        {/* Live Operational Status Indicator */}
        <div className="mb-6 mx-2 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium tracking-wide">Platform Systems Online</span>
        </div>

        {/* Admin Navigation (Exclusively Admin Routes) */}
        <div className="px-2 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Management &amp; Controls
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Admin User Footer Card */}
        <div className="mt-auto flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 font-semibold text-amber-700 dark:bg-amber-500/25 dark:text-amber-300">
            {(user.displayName ?? user.email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight">{user.displayName ?? user.email}</p>
            <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {user.role}
            </span>
          </div>
          <LogoutButton redirectTo="/admin/login" className="hover:bg-destructive/10 hover:text-destructive" />
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/brand/light_logo_single.png" alt="AIDA" width={22} height={22} className="dark:hidden" />
          <Image src="/brand/dark_logo_single.png" alt="AIDA" width={22} height={22} className="hidden dark:block" />
          <span className="font-heading text-base font-bold tracking-tight">AIDA</span>
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LogoutButton redirectTo="/admin/login" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-foreground"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-card p-4 sm:hidden">
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area - Wide Container for Admin Operations */}
      <main className="flex-1 overflow-y-auto sm:h-full">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
