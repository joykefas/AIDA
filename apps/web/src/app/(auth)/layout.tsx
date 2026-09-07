import Image from "next/image";
import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <AuthPanel />

      <div className="relative flex min-w-0 flex-col bg-neutral-25 dark:bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40svh] bg-[radial-gradient(60%_50%_at_50%_0%,var(--brand-100)_0%,transparent_70%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,var(--brand-950)_0%,transparent_70%)] lg:hidden"
        />

        <header className="flex items-center px-6 py-5 sm:px-10 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/brand/light_logo_single.png"
              alt="AIDA"
              width={28}
              height={28}
              className="dark:hidden"
            />
            <Image
              src="/brand/dark_logo_single.png"
              alt="AIDA"
              width={28}
              height={28}
              className="hidden dark:block"
            />
            <span className="font-heading text-lg font-semibold tracking-tight">AIDA</span>
          </Link>
        </header>

        <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-10 lg:px-16">
          {children}
        </main>
      </div>
    </div>
  );
}
