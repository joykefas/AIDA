import Image from "next/image";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/light_logo_single.png"
            alt="AIDA"
            width={20}
            height={20}
            className="dark:hidden"
          />
          <Image
            src="/brand/dark_logo_single.png"
            alt="AIDA"
            width={20}
            height={20}
            className="hidden dark:block"
          />
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AIDA. All rights reserved.
          </span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/trust" className="transition-colors hover:text-foreground">
            Trust
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
