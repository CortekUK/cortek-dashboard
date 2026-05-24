import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { sendNewUserCredentialsEmail } from "@/lib/email";

function generatePassword() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 14; i++) out += charset[bytes[i] % charset.length];
  return `${out}!`;
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getProfile();
  if (!me || me.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const admin = createSupabaseAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const tempPassword = generatePassword();
  const { error: updErr } = await admin.auth.admin.updateUserById(id, {
    password: tempPassword,
  });
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  try {
    await sendNewUserCredentialsEmail({
      to: target.email,
      fullName: target.full_name || "",
      tempPassword,
    });
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (e) {
    console.error("Failed to send reset email", e);
    return NextResponse.json({ ok: true, emailSent: false, tempPassword });
  }
}
