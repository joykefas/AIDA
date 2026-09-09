import { ShieldAlert } from "lucide-react";
import { AdminContactList } from "@/components/admin-contact-list";
import { serverFetch } from "@/lib/api";
import { UserRole, type ContactSubmissionDto, type UserProfile } from "@aida/shared";

export default async function AdminContactPage() {
  const user = await serverFetch<UserProfile>("/users/me");

  if (user.role === UserRole.STUDENT) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const submissions = await serverFetch<ContactSubmissionDto[]>("/contact");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Contact messages</h1>
      <AdminContactList initial={submissions} />
    </div>
  );
}
