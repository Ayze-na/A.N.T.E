import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "a.n.t.e162003@gmail.com";

const otpSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.trim().toLowerCase())
    .refine((e) => e === ADMIN_EMAIL, "invalid_admin_email"),
  next: z.string().max(300).optional(),
});

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
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
    return NextResponse.json({ ok: false, error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = otpSchema.safeParse(payload);
  if (!parsed.success) {
    // Don't reveal whether the address is valid — identical response.
    return NextResponse.json({ ok: true });
  }

  const { email, next } = parsed.data;

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