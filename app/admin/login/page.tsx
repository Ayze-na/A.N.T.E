"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasSupabase } from "@/lib/admin";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const isLive = hasSupabase();
  const next = params.get("next") || "/admin";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isLive) {
      // Demo mode: no backend configured — skip real auth.
      document.cookie = "ante_admin_session=1; path=/; max-age=86400";
      window.location.href = next;
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError("تعذر إرسال رابط الدخول، تأكد من البريد الإلكتروني");
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-700 text-xl font-black text-white">
            A
          </span>
          <h1 className="mt-3 text-xl font-black text-ink-900">دخول المشرف</h1>
          <p className="mt-1 text-xs text-ink-400">لوحة تحكم A.N.T.E</p>
        </div>

        {!isLive && (
          <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-800">
            وضع تجريبي (بدون اتصال بقاعدة البيانات) — أدخل أي بريد واضغط "دخول"
          </div>
        )}

        {sent ? (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-2xl">
              ✉️
            </span>
            <p className="mt-3 text-sm font-bold text-ink-800">
              تم إرسال رابط الدخول
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              اذهب إلى <b dir="ltr">a.n.t.e162003@gmail.com</b> واضغط على الرابط
              داخل رسالة <b>Supabase Auth</b> للدخول.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-xs font-bold text-primary-700 hover:underline"
            >
              تعديل البريد
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="البريد الإلكتروني"
              type="email"
              dir="ltr"
              placeholder="admin@ante.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-[11px] leading-5 text-ink-400">
              سنرسل لك رابط دخول آمن على بريدك — لا حاجة لكلمة مرور.
            </p>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              إرسال رابط الدخول
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}