"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasSupabase } from "@/lib/admin";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLive = hasSupabase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isLive) {
      // Demo mode: no backend configured — skip real auth.
      document.cookie = "ante_admin_session=1; path=/; max-age=86400";
      router.push(params.get("next") || "/admin");
      router.refresh();
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError("بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }
      router.push(params.get("next") || "/admin");
      router.refresh();
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
            وضع تجريبي (بدون اتصال بقاعدة البيانات) — اضغط "دخول" مباشرة
          </div>
        )}

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
          <Input
            label="كلمة المرور"
            type="password"
            dir="ltr"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            دخول
          </Button>
        </form>
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