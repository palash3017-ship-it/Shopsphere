"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SellerOrderActions({ itemId, status }: { itemId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: string) {
    if (next === "cancelled" && !confirm("Cancel this item? The buyer will be notified and the stock goes back on sale.")) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("order_items").update({ status: next }).eq("id", itemId);
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  if (status === "delivered" || status === "cancelled") return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "processing" && (
          <>
            <button onClick={() => setStatus("shipped")} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              Mark as shipped
            </button>
            <button onClick={() => setStatus("cancelled")} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
              Cancel
            </button>
          </>
        )}
        {status === "shipped" && (
          <button onClick={() => setStatus("delivered")} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            Mark as delivered
          </button>
        )}
      </div>
      {error && <p className="max-w-[16rem] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
