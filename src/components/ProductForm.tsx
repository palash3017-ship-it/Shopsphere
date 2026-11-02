"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { storagePathFromUrl } from "@/lib/storage";
import type { Category, Product } from "@/lib/types";

const MAX_IMAGE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [categoryId, setCategoryId] = useState(product?.category_id ? String(product.category_id) : "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image is too large. Maximum size is ${MAX_IMAGE_MB} MB.`);
      e.target.value = "";
      return;
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const priceNum = Number(price);
    const stockNum = Number(stock);
    if (!name.trim()) return setError("Product name is required.");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("Enter a valid price.");
    if (!Number.isInteger(stockNum) || stockNum < 0) return setError("Stock must be a whole number (0 or more).");

    setLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setError("You are logged out. Please log in again.");

      // 1. Upload new image if one was chosen
      let imageUrl = product?.image_url ?? null;
      let uploadedPath: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(uploadedPath, file, { contentType: file.type, cacheControl: "3600" });
        if (upErr) return setError(`Image upload failed: ${upErr.message}`);
        imageUrl = supabase.storage.from("product-images").getPublicUrl(uploadedPath).data.publicUrl;
      }

      // 2. Save the product row
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: priceNum,
        stock: stockNum,
        category_id: categoryId ? Number(categoryId) : null,
        is_active: isActive,
        image_url: imageUrl,
      };

      const { error: dbErr } = isEdit
        ? await supabase.from("products").update(payload).eq("id", product!.id)
        : await supabase.from("products").insert({ ...payload, seller_id: user.id });

      if (dbErr) {
        // Don't leave an orphan image behind if saving failed
        if (uploadedPath) await supabase.storage.from("product-images").remove([uploadedPath]);
        return setError(dbErr.message);
      }

      // 3. When an image was replaced, delete the old file
      if (isEdit && uploadedPath) {
        const oldPath = storagePathFromUrl(product!.image_url);
        if (oldPath) await supabase.storage.from("product-images").remove([oldPath]);
      }

      router.push("/seller/products");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-3">
      {/* Image column */}
      <div>
        <label className="text-sm font-medium text-gray-700">Product image</label>
        <div className="mt-1 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-gray-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <span className="px-4 text-center text-sm text-gray-400">No image yet</span>
          )}
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className="mt-3 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
        />
        <p className="mt-1 text-xs text-gray-400">JPG, PNG or WebP, up to {MAX_IMAGE_MB} MB.</p>
      </div>

      {/* Details column */}
      <div className="space-y-4 md:col-span-2">
        <div>
          <label className="text-sm font-medium text-gray-700">Product name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} placeholder="e.g. Wireless Bluetooth Headphones" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Price (₹)</label>
            <input type="number" min="0" step="0.01" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="999" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Stock quantity</label>
            <input type="number" min="0" step="1" className={inputClass} value={stock} onChange={(e) => setStock(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea rows={5} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe features, size, material, warranty..." />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          Visible to buyers
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? "Saving..." : isEdit ? "Save changes" : "Add product"}
          </button>
          <button type="button" onClick={() => router.push("/seller/products")} className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
