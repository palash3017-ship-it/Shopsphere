import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import { STATUS_LABEL, STATUS_STYLE, overallStatus, shortId, formatDate } from "@/lib/orders";

type Order = { id: string; total_amount: number; created_at: string; order_items: { status: string }[] };

export default async function BuyerAccount() {
  const { user, profile } = await requireRole("buyer");
  const supabase = await createClient();

  const [{ data: ordersData }, { data: cartData }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total_amount, created_at, order_items(status)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("cart_items").select("quantity").eq("user_id", user.id),
  ]);

  const orders = (ordersData ?? []) as unknown as Order[];
  const cartCount = (cartData ?? []).reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="mx-auto max-w-4xl py-10">
      <h1 className="text-2xl font-bold">Hi, {profile.full_name || "there"} 👋</h1>
      <p className="mt-1 text-gray-500">{user.email}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/buyer/orders" className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
          <p className="font-semibold">My orders</p>
          <p className="mt-1 text-sm text-gray-500">Track, review and cancel your orders</p>
        </Link>
        <Link href="/buyer/cart" className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
          <p className="font-semibold">My cart</p>
          <p className="mt-1 text-sm text-gray-500">{cartCount} item{cartCount === 1 ? "" : "s"} waiting for you</p>
        </Link>
      </div>

      <h2 className="mt-10 text-lg font-bold">Recent orders</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          No orders yet.{" "}
          <Link href="/" className="font-medium text-indigo-600 hover:underline">
            Start shopping
          </Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y rounded-2xl border bg-white shadow-sm">
          {orders.map((o) => {
            const status = overallStatus(o.order_items.map((i) => i.status));
            return (
              <li key={o.id}>
                <Link href={`/buyer/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-gray-50">
                  <div>
                    <p className="font-semibold">Order #{shortId(o.id)}</p>
                    <p className="text-gray-500">{formatDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
                    <span className="font-bold">{rupees(Number(o.total_amount))}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
