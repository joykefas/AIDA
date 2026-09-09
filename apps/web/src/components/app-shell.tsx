"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Home, Library, MessageCircle, CalendarClock, TrendingUp, Settings } from "lucide-react";
import { cn } from "cn";
import { LogoutButton } from "@/components/logout-button";
import type { UserProfile } from "@aida/shared";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/tutor", label: "Tutor", icon: MessageCircle },
  { href: "/review", label: "Review", icon: CalendarClock },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ user, children }: { user: UserProfile; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh sm:h-svh sm:overflow-hidden flex-col bg-background sm:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border px-4 py-6 sm:flex sm:h-full">
        <Link href="/home" className="mb-8 flex items-center gap-2 px-2">
          <Image src="/brand/light_logo_single.png" alt="AIDA" width={26} height={26} className="dark:hidden" />
          <Image src="/brand/dark_logo_single.png" alt="AIDA" width={26} height={26} className="hidden dark:block" />
          <span className="font-heading text-lg font-semibold tracking-tight">AIDA</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="size-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex shrink-0 items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            {(user.displayName ?? user.email)[0]?.toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate">{user.displayName ?? user.email}</span>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <Image src="/brand/light_logo_single.png" alt="AIDA" width={22} height={22} className="dark:hidden" />
          <Image src="/brand/dark_logo_single.png" alt="AIDA" width={22} height={22} className="hidden dark:block" />
          <span className="font-heading text-base font-semibold tracking-tight">AIDA</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            {(user.displayName ?? user.email)[0]?.toUpperCase()}
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 sm:pb-0 sm:h-full">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-background/95 backdrop-blur sm:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition active:scale-95",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
