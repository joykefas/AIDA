import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { serverFetch, ApiError } from "@/lib/api";
import { UserRole, type UserProfile } from "@aida/shared";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: UserProfile;
  try {
    user = await serverFetch<UserProfile>("/users/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/admin/login");
    }
    throw err;
  }

  // Reject students from admin console
  if (user.role === UserRole.STUDENT) {
    redirect("/home");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
