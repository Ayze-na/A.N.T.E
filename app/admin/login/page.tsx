"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasSupabase } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const isLive = hasSupabase();
  const next = params.get("next") || "/admin";
  const linkFailed = params.get("error") === "callback";

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
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), next }),
      });
      if (res.status === 429) {
        setError("محاولات كثيرة، حاول بعد فترة");
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError("تعذر إرسال رابط الدخول، حاول مرة أخرى");
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

  const verifyByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().replace(/\s/g, "");
    if (trimmed.length < 6) {
      setError("أدخل الكود المكوّن من 6 أرقام");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: trimmed,
        type: "email",
      });
      if (otpError) {
        setError("الكود غير صحيح أو منتهي الصلاحية");
        setVerifying(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-[#F2F1F7] p-8 shadow-lg">
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

        {linkFailed && (
          <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-center text-[11px] text-red-700">
            انتهت صلاحية رابط الدخول أو لم يكتمل — أرسل رابطاً جديداً من جديد.
          </div>
        )}

        {sent ? (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-2xl">
              ✉️
            </span>
            <p className="mt-3 text-sm font-bold text-ink-800">
              تم إرسال رمز الدخول
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              ستجد في البريد <b>رمزاً من 6 أرقام</b> — أدخله هنا للدخول مباشرة.
              <br />
              (إن لم يصلك البريد، افحص مجلد الرسائل غير المرغوب فيها)
            </p>

            <form onSubmit={verifyByCode} className="mt-4 space-y-3">
              <input
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-14 w-full rounded-xl border border-ink-300 bg-white px-4 text-center text-2xl font-black tracking-[0.5em] text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              {error && <p className="text-xs font-bold text-red-600">{error}</p>}
              <Button type="submit" className="w-full" loading={verifying}>
                دخول بالكود
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={() => {
                  setSent(false);
                  setError("");
                }}
                className="text-xs font-bold text-primary-700 hover:underline"
              >
                تعديل البريد
              </button>
            </div>
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
              سنرسل لك رمز مكوّناً من 6 أرقام على بريدك — لا حاجة لكلمة مرور.
            </p>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              إرسال رمز الدخول
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