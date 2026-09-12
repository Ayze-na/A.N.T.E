import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Password-based admin login that does NOT depend on email delivery.
 * The admin email + password are read from server-only env vars. This route
 * provisions the auth user (like send-otp) and pins its password to
 * ADMIN_PASSWORD so verifyOtp/signInWithPassword always succeed for the real
 * admin, while every other address/password gets the same failure response.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`pwd:${ip}`, 10, "10 m");
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
    return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  const { email, password } = parsed.data;

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    await admin.from("admin_emails").upsert({ email }, { onConflict: "email" });

    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = users?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { admin: true },
      });
      if (error) throw error;
      user = created?.user ?? null;
    } else if (!user.email_confirmed_at) {
      await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    }
    if (!user?.id) throw new Error("admin user missing");

    // Pin the auth user's password to ADMIN_PASSWORD (idempotent).
    await admin.auth.admin.updateUserById(user.id, { password: adminPassword });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin password login error", e);
    return NextResponse.json({ ok: false, error: "حدث خطأ، حاول مرة أخرى" }, { status: 500 });
  }
}