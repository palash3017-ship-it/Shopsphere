import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";
import SellerNav from "@/components/SellerNav";
import ProductForm from "@/components/ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).eq("seller_id", user.id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl py-10">
      <SellerNav />
      <h1 className="mb-6 text-2xl font-bold">Edit product</h1>
      <ProductForm categories={(categories ?? []) as Category[]} product={product as Product} />
    </div>
  );
}
