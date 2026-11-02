import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupees, LOW_STOCK_LIMIT } from "@/lib/format";
import type { Product } from "@/lib/types";
import SellerNav from "@/components/SellerNav";

export default async function SellerDashboard() {
  const { user, profile } = await requireRole("seller");
  const supabase = await createClient();

  const [{ data: productsData }, { data: itemsData }] = await Promise.all([
    supabase.from("products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }),
    supabase.from("order_items").select("unit_price, quantity, status").eq("seller_id", user.id),
  ]);

  const products = (productsData ?? []) as Product[];
  const items = itemsData ?? [];

  const activeCount = products.filter((p) => p.is_active).length;
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK_LIMIT);
  const earnings = items
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
  const pendingOrders = items.filter((i) => i.status === "processing").length;

  const stats = [
    { label: "Products listed", value: String(products.length), hint: `${activeCount} visible to buyers` },
    { label: "Needs attention", value: String(lowStock.length), hint: `stock of ${LOW_STOCK_LIMIT} or less` },
    { label: "Orders to process", value: String(pendingOrders), hint: `${items.length} orders in total` },
    { label: "Total earnings", value: rupees(earnings), hint: "excluding cancelled" },
  ];

  return (
    <div className="mx-auto max-w-6xl py-10">
      <SellerNav />

      <h1 className="text-2xl font-bold">Welcome, {profile.shop_name || profile.full_name}</h1>
      <p className="mt-1 text-gray-500">Here is how your shop is doing.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{s.value}</p>
            <p className="mt-1 text-xs text-gray-400">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Stock alerts */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Stock alerts</h2>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">All products are well stocked.</p>
          ) : (
            <ul className="mt-3 divide-y text-sm">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span className="max-w-[14rem] truncate">{p.name}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.stock === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Latest products */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Latest products</h2>
            <Link href="/seller/products" className="text-sm font-medium text-emerald-700 hover:underline">
              View all
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">
              You haven&apos;t added anything yet.{" "}
              <Link href="/seller/products/new" className="font-medium text-emerald-700 hover:underline">
                Add your first product
              </Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y text-sm">
              {products.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-medium">{rupees(p.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        Order activity updates as buyers place orders. Earnings exclude cancelled items.
      </p>
    </div>
  );
}
