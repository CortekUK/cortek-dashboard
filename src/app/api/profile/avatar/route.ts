import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 5MB)." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = admin.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, avatar_url: publicUrl.publicUrl });
}

export async function DELETE() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
