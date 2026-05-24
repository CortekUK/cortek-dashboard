import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { sendNewUserCredentialsEmail } from "@/lib/email";

const ROLES = ["super_admin", "manager", "dev"] as const;
type Role = (typeof ROLES)[number];

function generatePassword() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 14; i++) out += charset[bytes[i] % charset.length];
  return `${out}!`;
}

export async function GET() {
  const me = await getProfile();
  if (!me || me.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(req: Request) {
  const me = await getProfile();
  if (!me || me.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const role = body.role as Role;

  if (!email || !fullName) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const tempPassword = generatePassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message || "Could not create user." },
      { status: 400 }
    );
  }

  // Trigger sets role from raw_user_meta_data, but enforce again here in case it was edited.
  await admin
    .from("profiles")
    .update({ full_name: fullName, role })
    .eq("id", created.user.id);

  try {
    await sendNewUserCredentialsEmail({ to: email, fullName, tempPassword });
  } catch (e) {
    console.error("Failed to send welcome email", e);
    // Don't fail the whole request — return the temp password to the admin as a fallback.
    return NextResponse.json({
      ok: true,
      emailSent: false,
      tempPassword,
      warning: "User created, but the email could not be sent.",
    });
  }

  return NextResponse.json({ ok: true, emailSent: true });
}
