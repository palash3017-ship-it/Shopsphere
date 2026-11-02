"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";

export type CartLine = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    image_url: string | null;
    is_active: boolean;
  } | null;
};

export default function CartClient({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function setQty(line: CartLine, qty: number) {
    setError("");
    setBusyId(line.id);
    const supabase = createClient();
    const { error } =
      qty < 1
        ? await supabase.from("cart_items").delete().eq("id", line.id)
        : await supabase.from("cart_items").update({ quantity: qty }).eq("id", line.id);
    setBusyId(null);
    if (error) return setError(error.message);
    router.refresh();
  }

  const problems = lines.filter(
    (l) => !l.product || !l.product.is_active || l.product.stock < 1 || l.quantity > l.product.stock
  );
  const total = lines.reduce((sum, l) => sum + (l.product ? Number(l.product.price) * l.quantity : 0), 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {lines.map((l) => {
            const p = l.product;
            const unavailable = !p || !p.is_active || p.stock < 1;
            const tooMany = !!p && !unavailable && l.quantity > p.stock;
            const busy = busyId === l.id;

            return (
              <li key={l.id} className="flex gap-4 p-4 sm:p-5">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {p?.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    {p ? (
                      <Link href={`/product/${p.id}`} className="font-semibold leading-snug hover:text-indigo-600">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-gray-500">This product is no longer available</span>
                    )}
                    {p && <span className="font-bold">{rupees(Number(p.price) * l.quantity)}</span>}
                  </div>

                  {p && <p className="text-sm text-gray-500">{rupees(Number(p.price))} each</p>}
                  {unavailable && <p className="mt-1 text-sm font-medium text-red-600">Currently unavailable. Please remove it to continue.</p>}
                  {tooMany && <p className="mt-1 text-sm font-medium text-amber-600">Only {p!.stock} in stock. Please reduce the quantity.</p>}

                  <div className="mt-auto flex items-center gap-4 pt-3">
                    {!unavailable && p && (
                      <div className="flex items-center rounded-lg border">
                        <button disabled={busy} onClick={() => setQty(l, l.quantity - 1)} className="px-3 py-1.5 text-lg leading-none hover:bg-gray-50 disabled:opacity-50" aria-label="Decrease quantity">
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm font-medium">{l.quantity}</span>
                        <button disabled={busy || l.quantity >= p.stock} onClick={() => setQty(l, l.quantity + 1)} className="px-3 py-1.5 text-lg leading-none hover:bg-gray-50 disabled:opacity-40" aria-label="Increase quantity">
                          +
                        </button>
                      </div>
                    )}
                    <button disabled={busy} onClick={() => setQty(l, 0)} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-2xl border bg-white p-6 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Items ({itemCount})</dt>
            <dd>{rupees(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Delivery</dt>
            <dd className="font-medium text-emerald-600">Free</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd>{rupees(total)}</dd>
          </div>
        </dl>

        {problems.length > 0 ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Fix the highlighted items above to continue.
          </p>
        ) : (
          <Link href="/buyer/checkout" className="mt-5 block rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white hover:bg-indigo-700">
            Proceed to checkout
          </Link>
        )}
        <Link href="/" className="mt-3 block text-center text-sm font-medium text-indigo-600 hover:underline">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
