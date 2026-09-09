"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchSetting } from "@/lib/api";

function ConfirmationInner() {
  const params = useSearchParams();
  const order = params.get("order") ?? "";
  const [whatsapp, setWhatsapp] = useState<string>();

  useEffect(() => {
    fetchSetting("whatsapp_number").then((s) =>
      setWhatsapp(s?.whatsapp as string | undefined),
    );
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h1 className="mt-6 text-2xl font-black text-ink-900 sm:text-3xl">
          تم استلام طلبك بنجاح 🎉
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          شكراً لثقتك في A.N.T.E — سيتم مراجعة إثبات الدفع وتأكيد الطلب خلال
          ساعات، وسنتواصل معك على واتساب.
        </p>

        {order && (
          <div className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 px-8 py-5">
            <p className="text-xs font-bold text-primary-600">رقم الطلب</p>
            <p dir="ltr" className="mt-1 text-2xl font-black tracking-wider text-primary-800">
              {order}
            </p>
          </div>
        )}

        <a
          href={`https://wa.me/${whatsapp || "201000000000"}?text=${encodeURIComponent(
            `مرحباً، أريد متابعة طلب رقم ${order || ""}`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-bold text-white transition hover:bg-green-700"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.96 9.96 0 1 0 12.04 2Zm5.9 14.07c-.25.7-1.45 1.34-2 1.38-.52.04-1.02.2-3.45-.72-2.92-1.1-4.77-3.98-4.91-4.16-.14-.18-1.17-1.56-1.17-2.98 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36h.55c.17 0 .41-.06.64.5.23.56.8 1.95.87 2.09.07.14.12.3.02.49-.1.18-.14.3-.29.46-.14.18-.3.4-.43.54-.14.14-.29.3-.13.58.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.18.7-.81.88-1.09.18-.28.37-.24.62-.14.26.1 1.65.78 1.93.92.28.14.47.2.54.32.07.11.07.66-.18 1.31Z" />
          </svg>
          متابعة الطلب على واتساب
        </a>

        <Link
          href="/products"
          className="mt-4 text-sm font-bold text-primary-700 hover:underline"
        >
          ← تصفح المزيد من المنتجات
        </Link>
      </main>
      <Footer whatsapp={whatsapp} />
    </>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationInner />
    </Suspense>
  );
}