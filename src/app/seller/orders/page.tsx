import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import {
  STATUS_LABEL,
  STATUS_STYLE,
  PAYMENT_LABEL,
  PAYMENT_STATUS_LABEL,
  shortId,
  formatDate,
  type Address,
} from "@/lib/orders";
import SellerNav from "@/components/SellerNav";
import SellerOrderActions from "@/components/SellerOrderActions";

type Row = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  status: string;
  created_at: string;
  order_id: string;
  orders: { shipping_address: Address; payment_status: string; payment_method: string } | null;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "processing", label: "To process" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function SellerOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data } = await supabase
    .from("order_items")
    .select("id, name, quantity, unit_price, status, created_at, order_id, orders(shipping_address, payment_status, payment_method)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const active = TABS.some((t) => t.key === status) ? (status as string) : "all";
  const shown = active === "all" ? rows : rows.filter((r) => r.status === active);
  const count = (k: string) => (k === "all" ? rows.length : rows.filter((r) => r.status === k).length);

  return (
    <div className="mx-auto max-w-5xl py-10">
      <SellerNav />
      <h1 className="text-2xl font-bold">Orders</h1>
      <p className="mt-1 text-sm text-gray-500">Ship items to your buyers and keep their status up to date.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/seller/orders" : `/seller/orders?status=${t.key}`}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              active === t.key ? "border-emerald-600 bg-emerald-600 text-white" : "bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            {t.label} ({count(t.key)})
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-white p-12 text-center text-gray-500">
          {rows.length === 0 ? "No orders yet. They will appear here as soon as a buyer checks out." : "No orders in this tab."}
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((r) => {
            const a = r.orders?.shipping_address;
            return (
              <li key={r.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400">
                      Order #{shortId(r.order_id)} · {formatDate(r.created_at)}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{r.name}</p>
                    <p className="text-sm text-gray-500">
                      {rupees(Number(r.unit_price))} × {r.quantity} ={" "}
                      <span className="font-semibold text-gray-900">{rupees(Number(r.unit_price) * r.quantity)}</span>
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Ship to</p>
                    {a ? (
                      <p>
                        {a.full_name}, {a.phone}
                        <br />
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                      </p>
                    ) : (
                      <p>Address unavailable</p>
                    )}
                    {r.orders && (
                      <p className="mt-1 text-xs text-gray-500">
                        {PAYMENT_LABEL[r.orders.payment_method]} · {PAYMENT_STATUS_LABEL[r.orders.payment_status]}
                      </p>
                    )}
                  </div>
                  <SellerOrderActions itemId={r.id} status={r.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
