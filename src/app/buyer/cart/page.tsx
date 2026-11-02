import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CartClient, { type CartLine } from "@/components/CartClient";

type Raw = {
  id: string;
  quantity: number;
  products: CartLine["product"];
};

export default async function CartPage() {
  const { user } = await requireRole("buyer");
  const supabase = await createClient();

  const { data } = await supabase
    .from("cart_items")
    .select("id, quantity, products(id, name, price, stock, image_url, is_active)")
    .eq("user_id", user.id)
    .order("id");

  const lines: CartLine[] = ((data ?? []) as unknown as Raw[]).map((r) => ({
    id: r.id,
    quantity: r.quantity,
    product: r.products ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl py-10">
      <h1 className="mb-6 text-2xl font-bold">Shopping cart</h1>

      {lines.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-14 text-center">
          <p className="text-lg font-semibold">Your cart is empty</p>
          <p className="mt-1 text-gray-500">Browse products and add something you like.</p>
          <Link href="/" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
            Start shopping
          </Link>
        </div>
      ) : (
        <CartClient lines={lines} />
      )}
    </div>
  );
}
