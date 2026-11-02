import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rupees, LOW_STOCK_LIMIT } from "@/lib/format";
import Stars from "@/components/Stars";
import AddToCartButton from "@/components/AddToCartButton";
import ReviewForm from "@/components/ReviewForm";

type Review = { id: string; rating: number; comment: string | null; created_at: string; user_id: string };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: shop }, { data: ratingRow }, { data: reviewData }, { data: myProfile }] = await Promise.all([
    supabase.from("seller_shops").select("shop_name").eq("id", product.seller_id).maybeSingle(),
    supabase.from("product_ratings").select("avg_rating, review_count").eq("product_id", id).maybeSingle(),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("product_id", id)
      .order("created_at", { ascending: false }),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const reviews = (reviewData ?? []) as Review[];
  const names = new Map<string, string>();
  if (reviews.length > 0) {
    const { data: n } = await supabase
      .from("reviewer_names")
      .select("id, first_name")
      .in("id", Array.from(new Set(reviews.map((r) => r.user_id))));
    (n ?? []).forEach((r) => names.set(r.id, r.first_name));
  }

  const isBuyer = myProfile?.role === "buyer";
  const alreadyReviewed = !!user && reviews.some((r) => r.user_id === user.id);
  const isOwner = !!user && user.id === product.seller_id;

  const out = product.stock === 0;
  const low = !out && product.stock <= LOW_STOCK_LIMIT;

  return (
    <div className="mx-auto max-w-6xl py-8">
      <nav className="mb-5 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        {product.categories && (
          <>
            {" / "}
            <Link href={`/?category=${product.categories.slug}`} className="hover:text-gray-900">
              {product.categories.name}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-gray-900">{product.name}</span>
      </nav>

      {!product.is_active && isOwner && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This product is hidden from buyers. Only you can see this page.
        </p>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        {/* Image */}
        <div className="aspect-square overflow-hidden rounded-2xl border bg-gray-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">No image</div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.categories && (
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">{product.categories.name}</p>
          )}
          <h1 className="mt-1 text-3xl font-bold leading-tight">{product.name}</h1>

          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            {ratingRow ? (
              <>
                <Stars value={Number(ratingRow.avg_rating)} className="text-lg" />
                <span className="font-medium">{Number(ratingRow.avg_rating).toFixed(1)}</span>
                <span>({ratingRow.review_count} review{ratingRow.review_count === 1 ? "" : "s"})</span>
              </>
            ) : (
              <span className="text-gray-400">No reviews yet</span>
            )}
          </div>

          <p className="mt-5 text-4xl font-extrabold">{rupees(product.price)}</p>

          <p className={`mt-3 text-sm font-semibold ${out ? "text-red-600" : low ? "text-amber-600" : "text-emerald-600"}`}>
            {out ? "Out of stock" : low ? `Only ${product.stock} left in stock` : "In stock"}
          </p>

          <div className="mt-6">
            <AddToCartButton productId={product.id} stock={product.stock} />
          </div>

          <div className="mt-6 rounded-xl border bg-white p-4 text-sm text-gray-600">
            Sold by <span className="font-semibold text-gray-900">{shop?.shop_name ?? "ShopSphere seller"}</span>
          </div>

          {product.description && (
            <div className="mt-8">
              <h2 className="font-semibold">About this item</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-gray-700">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-14 max-w-3xl">
        <h2 className="text-xl font-bold">Customer reviews</h2>

        <div className="mt-4">
          {!user ? (
            <p className="rounded-xl border bg-white p-4 text-sm text-gray-600">
              <Link href="/buyer/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link> as a buyer to write a review.
            </p>
          ) : isBuyer && !alreadyReviewed ? (
            <ReviewForm productId={product.id} />
          ) : isBuyer ? (
            <p className="rounded-xl border bg-white p-4 text-sm text-gray-600">Thanks, you have already reviewed this product.</p>
          ) : null}
        </div>

        {reviews.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">No reviews yet. Be the first to share your thoughts.</p>
        ) : (
          <ul className="mt-6 divide-y rounded-xl border bg-white">
            {reviews.map((r) => (
              <li key={r.id} className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {(names.get(r.user_id) ?? "C").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{names.get(r.user_id) ?? "Customer"}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Stars value={r.rating} className="ml-auto text-base" />
                </div>
                {r.comment && <p className="mt-3 text-sm leading-relaxed text-gray-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
