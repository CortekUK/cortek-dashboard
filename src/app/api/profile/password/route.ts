import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { current_password, new_password } = await req.json().catch(() => ({}));
  if (typeof new_password !== "string" || new_password.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  if (typeof current_password !== "string" || !current_password) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  // Verify current password by attempting a sign-in on a throwaway admin client (won't touch the session).
  const admin = createSupabaseAdminClient();
  const { error: verifyError } = await admin.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  });
  if (verifyError) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  // Sign out the throwaway session so admin client doesn't hold state.
  await admin.auth.signOut().catch(() => {});

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: new_password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
