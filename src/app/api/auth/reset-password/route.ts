import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;

function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: Request) {
  const { email, otp, password } = await req.json().catch(() => ({}));
  if (!email || !otp || !password) {
    return NextResponse.json({ error: "Email, code, and new password are required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", String(email).trim())
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const { data: otpRow } = await admin
    .from("password_reset_otps")
    .select("*")
    .eq("user_id", profile.id)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  if (otpRow.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 400 });
  }

  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  }

  if (otpRow.otp_hash !== hashOtp(String(otp).trim())) {
    await admin
      .from("password_reset_otps")
      .update({ attempts: otpRow.attempts + 1 })
      .eq("id", otpRow.id);
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
    password,
  });
  if (updateError) {
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }

  await admin
    .from("password_reset_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", otpRow.id);

  return NextResponse.json({ ok: true });
}
