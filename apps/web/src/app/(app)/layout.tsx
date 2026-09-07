import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { serverFetch, ApiError } from "@/lib/api";
import type { UserProfile } from "@aida/shared";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  let user: UserProfile;
  try {
    user = await serverFetch<UserProfile>("/users/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/session-expired");
    throw err;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
