import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { serverFetch, ApiError } from "@/lib/api";
import { UserRole, type UserProfile } from "@aida/shared";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  let user: UserProfile;
  try {
    user = await serverFetch<UserProfile>("/users/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/session-expired");
    throw err;
  }

  // Redirect staff and administrators to the dedicated Admin Console
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPPORT) {
    redirect("/admin");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
