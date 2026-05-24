import "server-only";
import { Resend } from "resend";

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

function getFrom() {
  return process.env.RESEND_FROM_EMAIL || "Cortek Dashboard <onboarding@resend.dev>";
}

function appName() {
  return "Cortek Dashboard";
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function shell(title: string, body: string) {
  return `
  <div style="font-family: Inter, -apple-system, system-ui, sans-serif; background: #0c0a13; color: #efeaf6; padding: 40px 0;">
    <div style="max-width: 480px; margin: 0 auto; background: #16121d; border: 1px solid #2a2336; border-radius: 12px; padding: 32px;">
      <div style="font-weight: 600; font-size: 14px; color: #b59cf2; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 20px;">${appName()}</div>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #fff;">${title}</h1>
      ${body}
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #2a2336; font-size: 12px; color: #7a6f8b;">
        If you didn't expect this email, you can safely ignore it.
      </div>
    </div>
  </div>`;
}

export async function sendNewUserCredentialsEmail(params: {
  to: string;
  fullName: string;
  tempPassword: string;
}) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `\n[dev: Resend not configured]\nWelcome creds for ${params.to}:\n  password: ${params.tempPassword}\n`
      );
    }
    throw new Error("Email is not configured (RESEND_API_KEY missing).");
  }
  const resend = getResend();
  const body = `
    <p style="color: #cbc1dc; line-height: 1.6;">Hi ${escapeHtml(params.fullName) || "there"},</p>
    <p style="color: #cbc1dc; line-height: 1.6;">An account has been created for you on ${appName()}. Use the credentials below to sign in.</p>
    <div style="background: #1f1a29; border: 1px solid #2a2336; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="font-size: 12px; color: #7a6f8b; margin-bottom: 4px;">Email</div>
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #fff; margin-bottom: 12px;">${escapeHtml(params.to)}</div>
      <div style="font-size: 12px; color: #7a6f8b; margin-bottom: 4px;">Temporary password</div>
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #fff;">${escapeHtml(params.tempPassword)}</div>
    </div>
    <p style="color: #cbc1dc; line-height: 1.6;">After signing in, head to <strong>Profile</strong> to change your password.</p>
    <a href="${appUrl()}/login" style="display: inline-block; background: #7c5cff; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 500; margin-top: 8px;">Sign in</a>
  `;
  await resend.emails.send({
    from: getFrom(),
    to: params.to,
    subject: `Your ${appName()} account`,
    html: shell("Welcome aboard", body),
  });
}

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  otp: string;
}) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `\n[dev: Resend not configured]\nPassword reset OTP for ${params.to}: ${params.otp}\n`
      );
      return; // Allow the flow to complete in dev — read the OTP from server logs
    }
    throw new Error("Email is not configured (RESEND_API_KEY missing).");
  }
  const resend = getResend();
  const body = `
    <p style="color: #cbc1dc; line-height: 1.6;">Use the code below to reset your ${appName()} password. It expires in 10 minutes.</p>
    <div style="background: #1f1a29; border: 1px solid #2a2336; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #fff; font-size: 28px; letter-spacing: 0.4em; font-weight: 600;">${escapeHtml(params.otp)}</div>
    </div>
    <p style="color: #cbc1dc; line-height: 1.6;">If you didn't ask for a password reset, ignore this email and your password will stay the same.</p>
  `;
  await resend.emails.send({
    from: getFrom(),
    to: params.to,
    subject: `Your password reset code`,
    html: shell("Password reset code", body),
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
