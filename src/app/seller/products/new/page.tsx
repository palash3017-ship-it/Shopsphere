import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import SellerNav from "@/components/SellerNav";
import ProductForm from "@/components/ProductForm";

export default async function NewProduct() {
  await requireRole("seller");
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name").order("name");

  return (
    <div className="mx-auto max-w-5xl py-10">
      <SellerNav />
      <h1 className="mb-6 text-2xl font-bold">Add a new product</h1>
      <ProductForm categories={(data ?? []) as Category[]} />
    </div>
  );
}
