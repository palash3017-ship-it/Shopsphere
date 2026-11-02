import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupees, LOW_STOCK_LIMIT } from "@/lib/format";
import type { ProductWithCategory } from "@/lib/types";
import SellerNav from "@/components/SellerNav";
import ProductRowActions from "@/components/ProductRowActions";

export default async function SellerProducts() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as ProductWithCategory[];

  return (
    <div className="mx-auto max-w-6xl py-10">
      <SellerNav />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My products</h1>
          <p className="text-sm text-gray-500">{products.length} listed</p>
        </div>
        <Link href="/seller/products/new" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          + Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
          <p className="text-lg font-semibold">No products yet</p>
          <p className="mt-1 text-gray-500">Add your first product to start selling.</p>
          <Link href="/seller/products/new" className="mt-5 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {p.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="max-w-[16rem] truncate font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.categories?.name ?? "-"}</td>
                  <td className="px-4 py-3 font-medium">{rupees(p.price)}</td>
                  <td className="px-4 py-3">
                    {p.stock === 0 ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Out of stock</span>
                    ) : p.stock <= LOW_STOCK_LIMIT ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Low: {p.stock}</span>
                    ) : (
                      <span className="text-gray-700">{p.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {p.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ProductRowActions id={p.id} isActive={p.is_active} imageUrl={p.image_url} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
