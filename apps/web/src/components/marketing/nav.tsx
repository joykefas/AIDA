"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "Features" },
  { href: "/trust", label: "Trust" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // IntersectionObserver instead of a scroll listener — no per-frame work.
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Close the mobile menu on Escape, and stop the page from scrolling behind it.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div ref={sentinelRef} className="absolute top-0 h-2 w-px" aria-hidden />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled || open
            ? "border-b border-border bg-background/80 backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2" onClick={() => setOpen(false)}>
            <Image
              src="/brand/light_logo_single.png"
              alt="AIDA"
              width={26}
              height={26}
              className="size-6 dark:hidden sm:size-[26px]"
            />
            <Image
              src="/brand/dark_logo_single.png"
              alt="AIDA"
              width={26}
              height={26}
              className="hidden size-6 dark:block sm:size-[26px]"
            />
            <span className="font-heading text-base font-semibold tracking-tight sm:text-lg">AIDA</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
            {LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden lg:inline-flex")}>
              Log in
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "px-3 sm:h-9 sm:px-4")}
            >
              <span className="sm:hidden">Start free</span>
              <span className="hidden sm:inline">Start studying free</span>
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
            <div className="mx-auto flex max-w-6xl flex-col">
              {LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
              >
                Log in
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
