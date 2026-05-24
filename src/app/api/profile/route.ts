import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

export async function PATCH(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.full_name === "string") {
    updates.full_name = body.full_name.trim();
  }

  // Email change requires updating both auth.users + profiles.
  let nextEmail: string | undefined;
  if (typeof body.email === "string" && body.email.trim() !== user.email) {
    nextEmail = body.email.trim();
  }

  const supabase = await createSupabaseServerClient();

  if (nextEmail) {
    const admin = createSupabaseAdminClient();
    // Update auth email + mark confirmed so they aren't locked out (admin-managed flow).
    const { error: emailError } = await admin.auth.admin.updateUserById(user.id, {
      email: nextEmail,
      email_confirm: true,
    });
    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 400 });
    }
    updates.email = nextEmail;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
