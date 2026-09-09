"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { fetchAdminOrders } from "@/lib/admin";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OrderWithItems } from "@/lib/database.types";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminOrders().then((o) => {
      setOrders(o);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered");
    const totalRevenue = delivered.reduce((s, o) => s + o.subtotal, 0);
    const expectedRevenue = orders.reduce((s, o) => s + o.subtotal, 0);
    const countByStatus = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {});
    const avgOrderValue =
      orders.length > 0 ? expectedRevenue / orders.length : 0;

    const bestSellers = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((o) =>
      o.order_items.forEach((i) => {
        const cur = bestSellers.get(i.product_name) ?? {
          name: i.product_name,
          qty: 0,
          revenue: 0,
        };
        cur.qty += i.quantity;
        cur.revenue += i.quantity * i.unit_price;
        bestSellers.set(i.product_name, cur);
      }),
    );
    const top = Array.from(bestSellers.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    const byDay = new Map<string, number>();
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("en-CA");
      byDay.set(day, (byDay.get(day) ?? 0) + o.subtotal);
    });
    const chartData = Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([day, total]) => ({ day, total }));

    return {
      totalRevenue,
      expectedRevenue,
      countByStatus,
      avgOrderValue,
      top,
      chartData,
    };
  }, [orders]);

  const statusSummary = Object.entries(stats.countByStatus).map(([status, count]) => ({
    status: status as keyof typeof ORDER_STATUS_LABELS,
    count,
  }));

  const cards = [
    { label: "إيرادات (تم التسليم)", value: formatPrice(stats.totalRevenue), accent: "text-green-600" },
    { label: "إيرادات متوقعة", value: formatPrice(stats.expectedRevenue), accent: "text-primary-700" },
    { label: "متوسط قيمة الطلب", value: formatPrice(Math.round(stats.avgOrderValue)), accent: "text-ink-900" },
    { label: "إجمالي الطلبات", value: String(orders.length), accent: "text-indigo-600" },
  ];

  return (
    <AdminShell title="لوحة التحكم">
      {loading ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-ink-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-ink-100" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-ink-400">{c.label}</p>
                <p className={`mt-1 text-xl font-black sm:text-2xl ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart */}
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm lg:col-span-2">
              <h3 className="mb-4 font-black text-ink-800">الإيرادات على مدار الوقت</h3>
              {stats.chartData.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-400">
                  لا توجد بيانات بعد
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={stats.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Best sellers + status */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-black text-ink-800">الأكثر مبيعاً</h3>
                {stats.top.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-400">لا توجد بيانات</p>
                ) : (
                  <ul className="space-y-3">
                    {stats.top.map((t, i) => (
                      <li key={t.name} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-50 text-xs font-black text-primary-700">
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-bold text-ink-700">
                          {t.name}
                        </span>
                        <span className="text-xs font-black text-ink-500">×{t.qty}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-black text-ink-800">حالات الطلبات</h3>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ORDER_STATUS_LABELS) as (keyof typeof ORDER_STATUS_LABELS)[])
                    .sort()
                    .map((status) => (
                      <span key={status} className="flex items-center gap-2 text-xs font-bold text-ink-600">
                        <Badge className={ORDER_STATUS_STYLES[status]}>
                          {ORDER_STATUS_LABELS[status]}
                        </Badge>
                        {stats.countByStatus[status] ?? 0}
                      </span>
                    ))}
                </div>
                {statusSummary.length === 0 && (
                  <p className="mt-2 text-xs text-ink-400">لا توجد طلبات</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent orders */}
          <div className="rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="font-black text-ink-800">أحدث الطلبات</h3>
              <Link href="/admin/orders" className="text-xs font-bold text-primary-700 hover:underline">
                عرض الكل
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-t border-ink-100 bg-ink-50 text-right text-xs text-ink-500">
                    <th className="px-5 py-3 font-bold">رقم الطلب</th>
                    <th className="px-5 py-3 font-bold">العميل</th>
                    <th className="px-5 py-3 font-bold">الإجمالي</th>
                    <th className="px-5 py-3 font-bold">الحالة</th>
                    <th className="px-5 py-3 font-bold">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id} className="border-t border-ink-100">
                      <td dir="ltr" className="px-5 py-3 font-black text-ink-700">
                        {o.order_number}
                      </td>
                      <td className="px-5 py-3 font-semibold">{o.customer_name}</td>
                      <td className="px-5 py-3 font-bold text-primary-800">
                        {formatPrice(o.subtotal)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={ORDER_STATUS_STYLES[o.status]}>
                          {ORDER_STATUS_LABELS[o.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-ink-500">
                        {new Date(o.created_at).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-ink-400">
                        لا توجد طلبات بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}