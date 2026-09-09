"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { DEPOSIT_PERCENTAGE } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";

type Errors = Partial<{
  customer_name: string;
  phone_1: string;
  phone_2: string;
  address: string;
  city: string;
}>;

export default function CheckoutPage() {
  const { items } = useCartStore();
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    customer_name: "",
    phone_1: "",
    phone_2: "",
    address: "",
    city: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const deposit = Math.round(subtotal * DEPOSIT_PERCENTAGE);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.customer_name.trim()) e.customer_name = "الاسم مطلوب";
    if (!form.phone_1.trim()) e.phone_1 = "رقم الهاتف مطلوب";
    else if (!/^0?1[0125]\d{8}$/.test(form.phone_1.trim().replace(/\s/g, "")))
      e.phone_1 = "أدخل رقم هاتف مصري صحيح";
    if (!form.phone_2.trim()) e.phone_2 = "الرقم الثاني مطلوب";
    else if (!/^0?1[0125]\d{8}$/.test(form.phone_2.trim().replace(/\s/g, "")))
      e.phone_2 = "أدخل رقم هاتف مصري صحيح";
    if (!form.address.trim()) e.address = "العنوان مطلوب";
    if (!form.city.trim()) e.city = "المدينة مطلوبة";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!validate()) {
      toast("من فضلك أكمل البيانات المطلوبة", "error");
      return;
    }
    setSubmitting(true);
    // store order details to jump to payment (keeps this step pure client-side)
    sessionStorage.setItem(
      "ante-checkout",
      JSON.stringify({ ...form, subtotal, deposit }),
    );
    setSubmitting(false);
    router.push("/payment");
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="mx-auto flex max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <p className="text-lg font-bold text-ink-400">سلتك فارغة</p>
          <Link
            href="/products"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800"
          >
            تصفح المنتجات
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-black text-ink-900 sm:text-3xl">
          بيانات الشحن
        </h1>
        <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-black text-ink-800">معلومات التواصل</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="الاسم بالكامل"
                    name="customer_name"
                    placeholder="مثال: د. أحمد محمد"
                    value={form.customer_name}
                    onChange={set("customer_name")}
                    error={errors.customer_name}
                  />
                </div>
                <Input
                  label="رقم الهاتف 1 (واتساب)"
                  name="phone_1"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  inputMode="tel"
                  value={form.phone_1}
                  onChange={set("phone_1")}
                  error={errors.phone_1}
                />
                <Input
                  label="رقم الهاتف 2"
                  name="phone_2"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  inputMode="tel"
                  value={form.phone_2}
                  onChange={set("phone_2")}
                  error={errors.phone_2}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="المدينة"
                    name="city"
                    placeholder="مثال: القاهرة — مدينة نصر"
                    value={form.city}
                    onChange={set("city")}
                    error={errors.city}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Textarea
                    label="العنوان بالتفصيل"
                    name="address"
                    rows={3}
                    placeholder="الدور، الشقة، الشارع، علامة مميزة…"
                    value={form.address}
                    onChange={set("address")}
                    error={errors.address}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              متابعة للدفع ←
            </Button>
            <p className="text-center text-xs text-ink-400">
              التوصيل لكل المحافظات — الشحن مجاني 100%
            </p>
          </form>

          {/* Live summary */}
          <aside className="h-fit rounded-2xl border border-ink-100 bg-ink-50 p-5">
            <h2 className="font-black text-ink-900">ملخص الطلب</h2>
            <ul className="mt-4 max-h-56 space-y-3 overflow-y-auto">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-black text-white">
                    {item.quantity}
                  </span>
                  <span className="flex-1 font-semibold text-ink-700">
                    {item.name}
                    {item.customization?.name_tag_text &&
                      ` (${item.customization.name_tag_text})`}
                  </span>
                  <span className="font-bold">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-ink-200 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">المجموع الفرعي</dt>
                <dd className="font-bold">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">الشحن</dt>
                <dd className="font-bold text-green-600">مجاني</dd>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2 text-base">
                <dt className="font-black text-ink-800">الإجمالي</dt>
                <dd className="font-black text-ink-900">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-primary-50 px-3 py-2">
                <dt className="font-bold text-primary-800">
                  المطلوب دفعه الآن ({DEPOSIT_PERCENTAGE * 100}%)
                </dt>
                <dd className="font-black text-primary-800">{formatPrice(deposit)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}