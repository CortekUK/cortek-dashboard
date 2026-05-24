import { requireRole, type Profile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { UserManagement } from "./user-management";

export default async function UsersPage() {
  const me = await requireRole("super_admin");

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">User management</h1>
        <p className="text-sm text-muted-foreground">
          Create accounts and manage roles. New users receive sign-in details by email.
        </p>
      </div>
      <UserManagement currentUserId={me.id} initialUsers={(data || []) as Profile[]} />
    </div>
  );
}
