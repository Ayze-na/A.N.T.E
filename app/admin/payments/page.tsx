"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  addPaymentMethod,
  deletePaymentMethod,
  fetchAllPaymentMethods,
  fetchStoreSettings,
  savePaymentMethod,
  saveStoreSettings,
} from "@/lib/admin";
import type { PaymentMethodRow } from "@/lib/database.types";

export default function AdminPaymentsPage() {
  const { toast } = useToast();

  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);

  // WhatsApp
  const [whatsapp, setWhatsapp] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  // Add new method
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newHolder, setNewHolder] = useState("");
  const [addingBusy, setAddingBusy] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    label: "",
    phone_number: "",
    account_holder: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [ms, s] = await Promise.all([
      fetchAllPaymentMethods(),
      fetchStoreSettings(),
    ]);
    setMethods(ms);
    setWhatsapp(s.whatsapp_number);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveWhatsapp = async () => {
    setSavingWhatsapp(true);
    const current = await fetchStoreSettings();
    const ok = await saveStoreSettings({
      ...current,
      whatsapp_number: whatsapp.trim(),
    });
    setSavingWhatsapp(false);
    if (ok) toast("تم تحديث رقم الواتساب");
    else toast("فشل الحفظ", "error");
  };

  const toggleActive = async (m: PaymentMethodRow) => {
    const ok = await savePaymentMethod(m.id, { is_active: !m.is_active });
    if (ok) {
      setMethods((prev) =>
        prev.map((x) =>
          x.id === m.id ? { ...x, is_active: !m.is_active } : x,
        ),
      );
      toast(m.is_active ? "تم إيقاف الوسيلة" : "تم تفعيل الوسيلة");
    } else {
      toast("فشل الحفظ", "error");
    }
  };

  const startEdit = (m: PaymentMethodRow) => {
    setEditingId(m.id);
    setEditForm({
      label: m.label,
      phone_number: m.phone_number,
      account_holder: m.account_holder,
    });
  };

  const saveEdit = async (m: PaymentMethodRow) => {
    if (!editForm.label.trim() || !editForm.phone_number.trim()) {
      toast("أكمل الاسم ورقم الحساب", "error");
      return;
    }
    const ok = await savePaymentMethod(m.id, {
      label: editForm.label.trim(),
      phone_number: editForm.phone_number.trim(),
      account_holder: editForm.account_holder.trim(),
    });
    if (ok) {
      setMethods((prev) =>
        prev.map((x) =>
          x.id === m.id
            ? {
                ...x,
                label: editForm.label.trim(),
                phone_number: editForm.phone_number.trim(),
                account_holder: editForm.account_holder.trim(),
              }
            : x,
        ),
      );
      setEditingId(null);
      toast("تم تحديث الوسيلة");
    } else {
      toast("فشل الحفظ", "error");
    }
  };

  const add = async () => {
    if (!newLabel.trim() || !newPhone.trim()) {
      toast("أكمل اسم الوسيلة ورقم الحساب", "error");
      return;
    }
    setAddingBusy(true);
    const res = await addPaymentMethod({
      method: `method-${Date.now()}`,
      label: newLabel.trim(),
      phone_number: newPhone.trim(),
      account_holder: newHolder.trim(),
      is_active: true,
    });
    setAddingBusy(false);
    if (!res) {
      toast("فشل الإضافة", "error");
      return;
    }
    setMethods((prev) => [...prev, res]);
    setNewLabel("");
    setNewPhone("");
    setNewHolder("");
    setAdding(false);
    toast("تمت إضافة وسيلة الدفع");
  };

  const remove = async (id: string) => {
    const ok = await deletePaymentMethod(id);
    if (ok) {
      setMethods((prev) => prev.filter((x) => x.id !== id));
      toast("تم الحذف");
    } else {
      toast("فشل الحذف", "error");
    }
  };

  return (
    <AdminShell title="إدارة وسائل الدفع">
      {/* WhatsApp */}
      <div className="mb-6 max-w-xl rounded-2xl border border-ink-100 bg-[#F2F1F7] p-5 shadow-sm">
        <h3 className="mb-3 font-black text-ink-800">رقم الواتساب</h3>
        <p className="mb-3 text-xs text-ink-500">
          الرقم الذي يظهر في الموقع للتواصل، بصيغة دولية بدون +
        </p>
        <div>
          <Input
            label="رقم الواتساب (بصيغة دولية بدون +)"
            dir="ltr"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="201000000000"
          />
        </div>
        <div className="mt-3">
          <Button onClick={saveWhatsapp} loading={savingWhatsapp}>
            حفظ رقم الواتساب
          </Button>
        </div>
      </div>

      {/* Methods */}
      <div className="rounded-2xl border border-ink-100 bg-[#F2F1F7] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-black text-ink-800">وسائل الدفع</h3>
          <Button onClick={() => setAdding((v) => !v)}>
            {adding ? "إلغاء" : "+ إضافة وسيلة دفع"}
          </Button>
        </div>

        {adding && (
          <div className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="اسم الوسيلة (يظهر للعميل)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="مثال: فودافون كاش"
              />
              <Input
                label="رقم الحساب / رقم المحفظة"
                dir="ltr"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="01000000000"
              />
              <Input
                label="اسم الحساب (اختياري)"
                value={newHolder}
                onChange={(e) => setNewHolder(e.target.value)}
                placeholder="A.N.T.E"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={add} loading={addingBusy}>
                إضافة
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
        ) : methods.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-200 py-10 text-center text-ink-400">
            لا توجد وسائل دفع
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {methods.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white/60 p-4"
              >
                {editingId === m.id ? (
                  <div className="grid gap-3">
                    <Input
                      label="اسم الوسيلة"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="رقم الحساب"
                        dir="ltr"
                        value={editForm.phone_number}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            phone_number: e.target.value,
                          })
                        }
                      />
                      <Input
                        label="اسم الحساب"
                        value={editForm.account_holder}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            account_holder: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(m)}>
                        حفظ
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-ink-900">
                          {m.label || m.method}
                        </p>
                        {!m.is_active && <Badge>غير مفعل</Badge>}
                      </div>
                      <code
                        dir="ltr"
                        className="rounded-lg bg-primary-50 px-2.5 py-1 text-sm font-black text-primary-800"
                      >
                        {m.phone_number}
                      </code>
                    </div>
                    <p className="text-sm text-ink-500">
                      لحساب: {m.account_holder || "A.N.T.E"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleActive(m)}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                          m.is_active
                            ? "bg-ink-100 text-ink-600 hover:bg-ink-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200",
                        ].join(" ")}
                      >
                        {m.is_active ? "إيقاف" : "تفعيل"}
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(m)}
                      >
                        تعديل
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(m.id)}
                      >
                        حذف
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}