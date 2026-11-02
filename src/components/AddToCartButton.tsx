"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddToCartButton({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const out = stock <= 0;
  const maxQty = Math.max(1, Math.min(stock, 10));

  async function add() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/buyer/login");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "buyer") {
      setBusy(false);
      return setMsg({ ok: false, text: "Only buyer accounts can shop. Please log in with a buyer account." });
    }

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    const wanted = (existing?.quantity ?? 0) + qty;
    const newQty = Math.min(wanted, stock);

    const { error } = existing
      ? await supabase.from("cart_items").update({ quantity: newQty }).eq("id", existing.id)
      : await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: newQty });

    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });

    setMsg({
      ok: true,
      text: wanted > stock ? `Cart updated. Only ${stock} available, so that is the most you can add.` : "Added to your cart.",
    });
    router.refresh(); // updates the cart count in the navbar
  }

  return (
    <div>
      <div className="flex gap-3">
        {!out && (
          <select
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-base outline-none focus:border-indigo-500"
            aria-label="Quantity"
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={add}
          disabled={out || busy}
          className="flex-1 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {out ? "Out of stock" : busy ? "Adding..." : "Add to cart"}
        </button>
      </div>

      {msg && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}{" "}
          {msg.ok && (
            <Link href="/buyer/cart" className="font-semibold underline">
              View cart
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
