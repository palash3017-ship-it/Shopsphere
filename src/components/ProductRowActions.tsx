"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { storagePathFromUrl } from "@/lib/storage";

export default function ProductRowActions({
  id,
  isActive,
  imageUrl,
}: {
  id: string;
  isActive: boolean;
  imageUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("products").update({ is_active: !isActive }).eq("id", id);
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this product permanently? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const path = storagePathFromUrl(imageUrl);
    if (path) await supabase.storage.from("product-images").remove([path]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1 text-sm">
        <Link href={`/seller/products/${id}/edit`} className="rounded-md px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50">
          Edit
        </Link>
        <button onClick={toggle} disabled={busy} className="rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
          {isActive ? "Hide" : "Show"}
        </button>
        <button onClick={remove} disabled={busy} className="rounded-md px-2 py-1 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
          Delete
        </button>
      </div>
      {error && <p className="max-w-[16rem] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
