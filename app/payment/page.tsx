"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { fetchPaymentMethods } from "@/lib/api";
import { placeOrder } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import { DEPOSIT_PERCENTAGE, paymentMethodLabel } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentMethodRow } from "@/lib/database.types";

type CheckoutData = {
  customer_name: string;
  phone_1: string;
  phone_2: string;
  address: string;
  city: string;
  subtotal: number;
  deposit: number;
  website?: string;
};

export default function PaymentPage() {
  const { items, clear } = useCartStore();
  const router = useRouter();
  const { toast } = useToast();

  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [selected, setSelected] = useState<PaymentMethod>("instapay");
  const [proof, setProof] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("ante-checkout");
    if (raw) {
      try {
        setCheckout(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    fetchPaymentMethods().then(setMethods);
  }, []);

  const selectedMethod = methods.find((m) => m.method === selected);

  const handleProof = (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("حجم الصورة أكبر من 5MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProof(String(reader.result));
      setProofFile(file);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!checkout || items.length === 0) return;
    if (!selectedMethod) {
      toast("لا توجد وسيلة دفع مفعلة", "error");
      return;
    }
    if (!proof) {
      toast("من فضلك ارفع إثبات الدفع أولاً", "error");
      return;
    }
    setSubmitting(true);
    const result = await placeOrder({
      customer_name: checkout.customer_name,
      phone_1: checkout.phone_1,
      phone_2: checkout.phone_2,
      address: checkout.address,
      city: checkout.city,
      items,
      payment_method: selected,
      payment_proof_data: proof,
      payment_proof_name: proofFile?.name,
      honeypot: checkout.website ?? "",
    });
    setSubmitting(false);

    if (!result.ok) {
      toast(result.error ?? "حدث خطأ، حاول مرة أخرى", "error");
      return;
    }
    clear();
    sessionStorage.removeItem("ante-checkout");
    router.push(`/order-confirmation?order=${result.orderNumber}`);
  };

  const deposit = checkout?.deposit ?? 0;

  if (!checkout) {
    return (
      <>
        <Header />
        <main className="mx-auto flex max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <p className="text-lg font-bold text-ink-400">لا توجد طلبية قيد الدفع</p>
          <Link
            href="/products"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800"
          >
            تسوق الآن
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="mb-2 text-2xl font-black text-ink-900 sm:text-3xl">
          الدفع — دفعة مقدمة
        </h1>
        <p className="mb-6 text-sm font-medium text-ink-500">
          ادفع {DEPOSIT_PERCENTAGE * 100}% من قيمة الطلب ({formatPrice(deposit)}){" "}
          وباقي المبلغ ({formatPrice((checkout?.subtotal ?? 0) - deposit)}) عند
          الاستلام 💵
        </p>

        {/* Method selection */}
        <div className="space-y-4">
          {methods.length === 0 && (
            <p className="rounded-2xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
              لم يتم إعداد وسائل الدفع بعد
            </p>
          )}
          {methods.map((m) => (
            <button
              key={m.method}
              onClick={() => setSelected(m.method)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border-2 bg-[#F2F1F7] p-4 text-right transition",
                selected === m.method
                  ? "border-primary-600 ring-2 ring-primary-200"
                  : "border-ink-100 hover:border-primary-300",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected === m.method
                    ? "border-primary-700"
                    : "border-ink-300",
                )}
              >
                {selected === m.method && (
                  <span className="h-3 w-3 rounded-full bg-primary-700" />
                )}
              </span>
              <span className="flex-1">
                <span className="font-black text-ink-900">
                  {paymentMethodLabel(m.method, m.label)}
                </span>
                <span className="mt-0.5 block text-sm text-ink-500">
                  لحساب: {m.account_holder || "A.N.T.E"}
                </span>
              </span>
              <code
                dir="ltr"
                className="rounded-xl bg-primary-50 px-3 py-2 font-black text-primary-800"
              >
                {m.phone_number}
              </code>
            </button>
          ))}
        </div>

        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          ⚠️ يرجى تحويل مبلغ{" "}
          <b>{formatPrice(deposit)}</b> على الرقم المختار ثم رفع لقطة شاشة
          بالإثبات. سيتم مراجعة الطلب وتأكيده يدوياً، ويدفع الباقي عند الاستلام.
        </p>

        {/* Proof upload */}
        <div className="mt-6">
          {proof ? (
            <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-ink-200">
              <Image
                src={proof}
                alt="إثبات الدفع"
                width={400}
                height={400}
                className="w-full object-cover"
              />
              <button
                onClick={() => {
                  setProof(null);
                  setProofFile(null);
                }}
                className="absolute left-2 top-2 rounded-full bg-ink-900/70 px-3 py-1 text-xs font-bold text-white hover:bg-ink-900"
              >
                تغيير
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50 px-4 py-10 text-center transition hover:border-primary-400 hover:bg-primary-50">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary-600">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span className="text-sm font-bold text-ink-700">
                ارفع لقطة شاشة لإثبات الدفع
              </span>
              <span className="text-xs text-ink-400">
                PNG / JPG / WebP بحد أقصى 5MB
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProof(f);
                }}
              />
            </label>
          )}
        </div>

        <Button
          size="lg"
          className="mt-6 w-full"
          loading={submitting}
          onClick={submit}
        >
          تأكيد الطلب ودفع المقدمة
        </Button>
      </main>
      <Footer />
    </>
  );
}