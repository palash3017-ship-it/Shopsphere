import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import CheckoutForm from "@/components/CheckoutForm";
import type { Address } from "@/lib/orders";

type Raw = {
  quantity: number;
  products: { id: string; name: string; price: number; stock: number; image_url: string | null; is_active: boolean } | null;
};

export default async function CheckoutPage() {
  const { user, profile } = await requireRole("buyer");
  const supabase = await createClient();

  const [{ data: cartData }, { data: addrData }] = await Promise.all([
    supabase
      .from("cart_items")
      .select("quantity, products(id, name, price, stock, image_url, is_active)")
      .eq("user_id", user.id),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  const lines = ((cartData ?? []) as unknown as Raw[]).filter((l) => l.products);
  if (lines.length === 0) redirect("/buyer/cart");

  // Anything unavailable or over-stock goes back to the cart to be fixed first
  const bad = lines.some((l) => !l.products!.is_active || l.products!.stock < l.quantity);
  if (bad || lines.length !== (cartData ?? []).length) redirect("/buyer/cart");

  const total = lines.reduce((sum, l) => sum + Number(l.products!.price) * l.quantity, 0);
  const addresses = (addrData ?? []) as (Address & { id: string })[];

  return (
    <div className="mx-auto max-w-6xl py-10">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm addresses={addresses} defaultName={profile.full_name ?? ""} total={total} />
        </div>

        <aside className="h-fit rounded-2xl border bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Your order</h2>
          <ul className="mt-4 divide-y">
            {lines.map((l) => (
              <li key={l.products!.id} className="flex items-center gap-3 py-3 text-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {l.products!.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.products!.image_url} alt={l.products!.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1 font-medium">{l.products!.name}</p>
                  <p className="text-gray-500">Qty {l.quantity}</p>
                </div>
                <span className="font-medium">{rupees(Number(l.products!.price) * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-3 text-sm">
            <span className="text-gray-600">Delivery</span>
            <span className="font-medium text-emerald-600">Free</span>
          </div>
          <div className="mt-2 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{rupees(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
