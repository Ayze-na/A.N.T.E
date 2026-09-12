"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { fetchAdminOrders, updateOrderStatusDb, fetchAllPaymentMethods, resolveStorageSignedUrl } from "@/lib/admin";
import { fetchPresetLogos } from "@/lib/api";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_STYLES,
  paymentMethodLabel,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { OrderStatus, OrderWithItems } from "@/lib/database.types";

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<OrderWithItems | null>(null);
  const [exporting, setExporting] = useState(false);
  const [methodLabels, setMethodLabels] = useState<Record<string, string>>({});
  const [proofSrc, setProofSrc] = useState<string | null>(null);
  const [logoSrcs, setLogoSrcs] = useState<Record<string, string>>({});
  const [presetLogos, setPresetLogos] = useState<
    Record<string, { image_url: string; label: string }>
  >({});

  useEffect(() => {
    if (!selected) {
      setProofSrc(null);
      setLogoSrcs({});
      setPresetLogos({});
      return;
    }
    let live = true;
    (async () => {
      const proof = selected.payment_proof_url
        ? await resolveStorageSignedUrl("payment-proofs", selected.payment_proof_url)
        : null;
      const logos: Record<string, string> = {};
      await Promise.all(
        selected.order_items.map(async (item) => {
          if (
            item.customization_type === "uploaded" &&
            item.customization_logo_url_or_preset_id
          ) {
            const src = await resolveStorageSignedUrl(
              "uploaded-logos",
              item.customization_logo_url_or_preset_id,
            );
            if (src) logos[item.id] = src;
          }
        }),
      );
      const presets = await fetchPresetLogos();
      const presetMap: Record<string, { image_url: string; label: string }> = {};
      presets.forEach((p) => {
        presetMap[p.id] = { image_url: p.image_url, label: p.label };
      });
      if (!live) return;
      setProofSrc(proof);
      setLogoSrcs(logos);
      setPresetLogos(presetMap);
    })();
    return () => {
      live = false;
    };
  }, [selected]);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, methods] = await Promise.all([
      fetchAdminOrders(),
      fetchAllPaymentMethods(),
    ]);
    setOrders(data);
    setMethodLabels(
      Object.fromEntries(methods.map((m) => [m.method, m.label || m.method])),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const changeStatus = async (id: string, status: OrderStatus) => {
    const ok = await updateOrderStatusDb(id, status);
    if (ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status, updated_at: new Date().toISOString() } : o,
        ),
      );
      toast("تم تحديث حالة الطلب");
    } else {
      toast("فشل تحديث الحالة", "error");
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("الطلبات", {
        views: [{ rightToLeft: true }],
      });
      sheet.columns = [
        { header: "رقم الطلب", key: "order_number", width: 20 },
        { header: "التاريخ", key: "created_at", width: 20 },
        { header: "العميل", key: "customer_name", width: 20 },
        { header: "هاتف 1", key: "phone_1", width: 18 },
        { header: "هاتف 2", key: "phone_2", width: 18 },
        { header: "المدينة", key: "city", width: 16 },
        { header: "العنوان", key: "address", width: 40 },
        { header: "المنتجات", key: "items", width: 60 },
        { header: "الإجمالي", key: "subtotal", width: 12 },
        { header: "المقدمة 20%", key: "deposit", width: 12 },
        { header: "الباقي COD", key: "remaining", width: 12 },
        { header: "وسيلة الدفع", key: "payment_method", width: 16 },
        { header: "الحالة", key: "status", width: 14 },
      ];
      orders.forEach((o) => {
        sheet.addRow({
          order_number: o.order_number,
          created_at: new Date(o.created_at).toLocaleString("ar-EG"),
          customer_name: o.customer_name,
          phone_1: o.phone_1,
          phone_2: o.phone_2,
          city: o.city,
          address: o.address,
          items: o.order_items
            .map(
              (i) =>
                `${i.product_name} (${i.color} ${i.size}) ×${i.quantity}${i.name_tag_text ? ` — اسم: ${i.name_tag_text}` : ""}`,
            )
            .join("\n"),
          subtotal: o.subtotal,
          deposit: o.deposit_amount,
          remaining: o.remaining_amount,
          payment_method: paymentMethodLabel(o.payment_method, methodLabels[o.payment_method]),
          status: ORDER_STATUS_LABELS[o.status],
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ante-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast("تم تصدير ملف Excel");
    } catch (e) {
      console.error(e);
      toast("فشل التصدير", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminShell title="إدارة الطلبات">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            الكل ({orders.length})
          </FilterChip>
          {ORDER_STATUS_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={filter === opt.value}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label} ({orders.filter((o) => o.status === opt.value).length})
            </FilterChip>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={exportExcel} loading={exporting}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          تصدير Excel
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-[#F2F1F7] shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-right text-xs text-ink-500">
                  <th className="px-4 py-3 font-bold">الطلب</th>
                  <th className="px-4 py-3 font-bold">العميل</th>
                  <th className="px-4 py-3 font-bold">المدينة</th>
                  <th className="px-4 py-3 font-bold">الإجمالي</th>
                  <th className="px-4 py-3 font-bold">المقدمة</th>
                  <th className="px-4 py-3 font-bold">الدفع</th>
                  <th className="px-4 py-3 font-bold">الحالة</th>
                  <th className="px-4 py-3 font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="cursor-pointer border-b border-ink-100 transition hover:bg-primary-50/50"
                  >
                    <td dir="ltr" className="px-4 py-3 font-black text-primary-700">
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink-800">
                      {o.customer_name}
                    </td>
                    <td className="px-4 py-3 text-ink-500">{o.city}</td>
                    <td className="px-4 py-3 font-black text-ink-900">
                      {formatPrice(o.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{formatPrice(o.deposit_amount)}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">
                      {paymentMethodLabel(o.payment_method, methodLabels[o.payment_method])}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ORDER_STATUS_STYLES[o.status]}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {new Date(o.created_at).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-ink-400">
                      لا توجد طلبات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="تفاصيل الطلب"
        size="lg"
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-50 p-4">
              <div>
                <p dir="ltr" className="text-lg font-black text-ink-900">
                  {selected.order_number}
                </p>
                <p className="text-xs text-ink-500">
                  {new Date(selected.created_at).toLocaleString("ar-EG")}
                </p>
              </div>
              <select
                value={selected.status}
                onChange={(e) =>
                  changeStatus(selected.id, e.target.value as OrderStatus)
                }
                className="h-10 rounded-xl border border-ink-300 bg-[#F2F1F7] px-3 text-sm font-bold"
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink-100 p-4">
                <h4 className="mb-2 font-black text-ink-800">بيانات العميل</h4>
                <dl className="space-y-1.5 text-sm">
                  <Info label="الاسم" value={selected.customer_name} />
                  <Info label="هاتف 1" value={selected.phone_1} ltr />
                  <Info label="هاتف 2" value={selected.phone_2} ltr />
                  <Info label="المدينة" value={selected.city} />
                  <Info label="العنوان" value={selected.address} />
                </dl>
              </div>
              <div className="rounded-2xl border border-ink-100 p-4">
                <h4 className="mb-2 font-black text-ink-800">الدفع</h4>
                <dl className="space-y-1.5 text-sm">
                  <Info label="الإجمالي" value={formatPrice(selected.subtotal)} />
                  <Info label="المقدمة (20%)" value={formatPrice(selected.deposit_amount)} />
                  <Info label="الباقي عند الاستلام" value={formatPrice(selected.remaining_amount)} />
                  <Info
                    label="الوسيلة"
                    value={paymentMethodLabel(selected.payment_method, methodLabels[selected.payment_method])}
                  />
                </dl>
                {proofSrc ? (
                  <a
                    href={proofSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary-700 hover:underline"
                  >
                    فتح إثبات الدفع
                    <Image
                      src={proofSrc}
                      alt="إثبات"
                      width={48}
                      height={48}
                      className="rounded-lg object-cover"
                    />
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-ink-400">لا يوجد إثبات دفع</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-black text-ink-800">المنتجات ({selected.order_items.length})</h4>
              <div className="space-y-2">
                {selected.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-ink-100 bg-[#F2F1F7] p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-ink-800">{item.product_name}</p>
                      <span className="text-xs text-ink-500">
                        {formatPrice(item.unit_price)} × {item.quantity}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {[item.color, item.size].filter(Boolean).join(" — ")}
                      {item.name_tag_text && ` • الاسم: ${item.name_tag_text}`}
                    </p>
                    {(() => {
                      const preset = item.customization_type === "preset"
                        ? presetLogos[item.customization_logo_url_or_preset_id ?? ""]
                        : null;
                      const uploadedSrc = item.customization_type === "uploaded"
                        ? logoSrcs[item.id]
                        : null;
                      const logoSrc = preset?.image_url ?? uploadedSrc;
                      if (!logoSrc) return null;
                      return (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-ink-400">
                            {item.customization_type === "preset"
                              ? `شعار (${preset?.label || "جاهز"}):`
                              : "شعار مرفوع:"}
                          </span>
                          <Image
                            src={logoSrc}
                            alt="شعار"
                            width={32}
                            height={32}
                            className="rounded-md object-contain"
                          />
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 rounded-full px-3.5 text-xs font-bold transition ${
        active
          ? "bg-primary-700 text-white"
          : "border border-ink-200 bg-[#F2F1F7] text-ink-600 hover:border-primary-300"
      }`}
    >
      {children}
    </button>
  );
}

function Info({
  label,
  value,
  ltr,
}: {
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd dir={ltr ? "ltr" : undefined} className="text-left font-bold text-ink-800">
        {value}
      </dd>
    </div>
  );
}