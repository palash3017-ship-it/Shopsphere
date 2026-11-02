import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import { STATUS_LABEL, STATUS_STYLE, overallStatus, shortId, formatDate } from "@/lib/orders";

type Item = { id: string; name: string; quantity: number; status: string; products: { image_url: string | null } | null };
type Order = { id: string; total_amount: number; created_at: string; order_items: Item[] };

export default async function BuyerOrders() {
  const { user } = await requireRole("buyer");
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("id, total_amount, created_at, order_items(id, name, quantity, status, products(image_url))")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as Order[];

  return (
    <div className="mx-auto max-w-4xl py-10">
      <h1 className="mb-6 text-2xl font-bold">My orders</h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-14 text-center">
          <p className="text-lg font-semibold">No orders yet</p>
          <p className="mt-1 text-gray-500">When you place an order, it will show up here.</p>
          <Link href="/" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const status = overallStatus(o.order_items.map((i) => i.status));
            return (
              <li key={o.id}>
                <Link href={`/buyer/orders/${o.id}`} className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">Order #{shortId(o.id)}</p>
                      <p className="text-sm text-gray-500">Placed on {formatDate(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
                      <span className="font-bold">{rupees(Number(o.total_amount))}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {o.order_items.slice(0, 5).map((i) => (
                      <div key={i.id} className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100" title={i.name}>
                        {i.products?.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.products.image_url} alt={i.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                    {o.order_items.length > 5 && <span className="text-sm text-gray-500">+{o.order_items.length - 5} more</span>}
                    <span className="ml-2 text-sm text-gray-500">
                      {o.order_items.length} item{o.order_items.length === 1 ? "" : "s"}
                    </span>
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
