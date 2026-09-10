"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const code = params.get("code");
      const next = params.get("next") || "/admin";
      const target = next.startsWith("/admin") ? next : "/admin";

      if (!code) {
        router.replace("/admin/login");
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (!cancelled) {
          router.replace(target);
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          router.replace("/admin/login?error=callback");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F1F7] text-sm font-bold text-ink-600">
      جارٍ الدخول… انتظر لحظة
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}