import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const otpSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.trim().toLowerCase()),
  next: z.string().max(300).optional(),
});

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * The single admin email, read only from the server-side ADMIN_EMAIL env var.
 * It is never referenced in the client bundle or in this repository, so it
 * cannot leak through GitHub/Vercel build output a public page.
 */
function adminEmail(): string {
  const a = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!a) throw new Error("ADMIN_EMAIL is not configured");
  return a;
}

/**
 * Idempotent, on-demand provisioning (service role): allowlists the admin
 * email in public.admin_emails and makes sure the passwordless auth user
 * exists and is confirmed — so admin login works even with signups disabled
 * and requires no pre-seeded email literal anywhere.
 */
async function ensureAdminConfigured(): Promise<void> {
  const email = adminEmail();
  const admin = createAdminClient();

  await admin.from("admin_emails").upsert({ email }, { onConflict: "email" });

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = users?.users?.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    if (!existing.email_confirmed_at) {
      await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
    }
    return;
  }
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { admin: true },
  });
  if (error) console.error("admin provisioning error", error.message);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`otp:${ip}`, 6, "5 m");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "محاولات كثيرة، حاول بعد فترة" },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    // Identical response for invalid payloads — no account enumeration.
    return NextResponse.json({ ok: true });
  }

  const parsed = otpSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const { email, next } = parsed.data;

  try {
    await ensureAdminConfigured();
  } catch (e) {
    console.error("admin provisioning failed", e);
  }

  if (email !== adminEmail()) {
    // Non-admin address: provision already ran, but no OTP is sent and the
    // response stays identical (ok:true) to avoid revealing the allowlist.
    return NextResponse.json({ ok: true });
  }

  const emailRl = await rateLimit(`otp-mail:${email}`, 3, "10 m");
  if (!emailRl.ok) {
    return NextResponse.json(
      { ok: false, error: "تم إرسال عدة روابط مؤخراً، حاول بعد فترة" },
      { status: 429 },
    );
  }

  const baseUrl = new URL(req.url).origin;
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";
  const emailRedirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      },
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });
    if (error) {
      console.error("send otp error", error.message);
    }
    // Always return ok to avoid leaking account/template state.
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("send otp exception", e);
    return NextResponse.json({ ok: true });
  }
}