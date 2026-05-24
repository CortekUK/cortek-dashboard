import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";

const ROLES = ["super_admin", "manager", "dev"] as const;
type Role = (typeof ROLES)[number];

async function requireSuperAdmin() {
  const me = await getProfile();
  if (!me || me.role !== "super_admin") return null;
  return me;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireSuperAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const role = body.role as Role | undefined;

  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Don't let a super_admin demote themselves and leave zero super admins.
  if (id === me.id && role !== "super_admin") {
    const admin = createSupabaseAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "You're the last super admin — assign another first." },
        { status: 400 }
      );
    }
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireSuperAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (id === me.id) {
    return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
