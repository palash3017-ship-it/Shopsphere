import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductCard, { type CardProduct } from "@/components/ProductCard";

const PAGE_SIZE = 12;

type SearchParams = { q?: string; category?: string; sort?: string; page?: string };
type CategoryRow = { id: number; name: string; slug: string };

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  // Clean user input (these characters would break the search filter)
  const q = (sp.q ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 80);
  const sort = SORTS.some((s) => s.key === sp.sort) ? (sp.sort as string) : "newest";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();

  const { data: catData } = await supabase.from("categories").select("id, name, slug").order("name");
  const categories = (catData ?? []) as CategoryRow[];
  const activeCat = categories.find((c) => c.slug === sp.category);

  let query = supabase
    .from("products")
    .select("id, name, price, stock, image_url, categories(name)", { count: "exact" })
    .eq("is_active", true);

  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  if (activeCat) query = query.eq("category_id", activeCat.id);

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const products = (data ?? []) as unknown as CardProduct[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Ratings for the products on this page
  const ratingMap = new Map<string, { avg_rating: number; review_count: number }>();
  if (products.length > 0) {
    const { data: ratings } = await supabase
      .from("product_ratings")
      .select("product_id, avg_rating, review_count")
      .in("product_id", products.map((p) => p.id));
    (ratings ?? []).forEach((r) =>
      ratingMap.set(r.product_id, { avg_rating: Number(r.avg_rating), review_count: r.review_count })
    );
  }

  // Builds a link that keeps the current filters but changes some of them
  function href(over: Partial<SearchParams>) {
    const merged: SearchParams = {
      q: q || undefined,
      category: activeCat?.slug,
      sort: sort !== "newest" ? sort : undefined,
      ...over,
    };
    const p = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, String(v));
    });
    const s = p.toString();
    return s ? `/?${s}` : "/";
  }

  const filtering = !!q || !!activeCat;
  const showHero = !filtering && page === 1;

  return (
    <div className="mx-auto max-w-6xl py-8">
      {showHero && (
        <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-12 text-white sm:px-14">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything you need, from sellers you can trust</h1>
          <p className="mt-3 max-w-xl text-white/85">Browse products from independent shops, compare prices and read real reviews.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/seller/signup" className="rounded-xl border border-white/60 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
              Become a seller
            </Link>
          </div>
        </section>
      )}

      {/* Search */}
      <form action="/" className="flex gap-2">
        {activeCat && <input type="hidden" name="category" value={activeCat.slug} />}
        {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products..."
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button className="rounded-xl bg-indigo-600 px-6 font-semibold text-white hover:bg-indigo-700">Search</button>
      </form>

      {/* Categories */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={href({ category: undefined })}
          className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            !activeCat ? "border-indigo-600 bg-indigo-600 text-white" : "bg-white text-gray-700 hover:border-gray-400"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={href({ category: c.slug })}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activeCat?.id === c.id ? "border-indigo-600 bg-indigo-600 text-white" : "bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Results header + sort */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {count ?? 0} product{count === 1 ? "" : "s"}
          {q && <> for &ldquo;<span className="font-medium text-gray-900">{q}</span>&rdquo;</>}
          {activeCat && <> in <span className="font-medium text-gray-900">{activeCat.name}</span></>}
          {filtering && (
            <Link href="/" className="ml-3 font-medium text-indigo-600 hover:underline">
              Clear filters
            </Link>
          )}
        </p>
        <div className="flex items-center gap-1 text-sm">
          <span className="mr-1 text-gray-500">Sort:</span>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={href({ sort: s.key === "newest" ? undefined : s.key })}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                sort === s.key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed bg-white p-14 text-center">
          <p className="text-lg font-semibold">No products found</p>
          <p className="mt-1 text-gray-500">
            {filtering
              ? "Try a different search or clear the filters."
              : "No products are listed yet. Sellers can add products from their dashboard."}
          </p>
          {filtering && (
            <Link href="/" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
              View all products
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} rating={ratingMap.get(p.id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className="rounded-lg border bg-white px-4 py-2 font-medium hover:bg-gray-50">
              ← Previous
            </Link>
          ) : (
            <span className="rounded-lg border bg-gray-50 px-4 py-2 text-gray-300">← Previous</span>
          )}
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href({ page: String(page + 1) })} className="rounded-lg border bg-white px-4 py-2 font-medium hover:bg-gray-50">
              Next →
            </Link>
          ) : (
            <span className="rounded-lg border bg-gray-50 px-4 py-2 text-gray-300">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
