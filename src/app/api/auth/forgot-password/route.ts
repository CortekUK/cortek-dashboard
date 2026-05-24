import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetOtpEmail } from "@/lib/email";

const OTP_TTL_MINUTES = 10;

function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", email.trim())
    .maybeSingle();

  // Always respond ok to avoid leaking which emails exist.
  if (!profile) {
    return NextResponse.json({ ok: true });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

  const { error: insertError } = await admin.from("password_reset_otps").insert({
    user_id: profile.id,
    otp_hash: hashOtp(otp),
    expires_at: expiresAt,
  });
  if (insertError) {
    return NextResponse.json({ error: "Could not start password reset." }, { status: 500 });
  }

  try {
    await sendPasswordResetOtpEmail({ to: profile.email, otp });
  } catch (e) {
    console.error("Failed to send reset OTP email", e);
    return NextResponse.json({ error: "Could not send reset email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
