"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CancelItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!confirm("Cancel this item? The seller will be notified and the stock is released.")) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_order_item", { p_item_id: itemId });
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <div>
      <button onClick={cancel} disabled={busy} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
        {busy ? "Cancelling..." : "Cancel item"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
