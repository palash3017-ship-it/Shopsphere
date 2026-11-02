import Link from "next/link";
import { rupees } from "@/lib/format";
import Stars from "@/components/Stars";

export type CardProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  categories: { name: string } | null;
};

export default function ProductCard({
  product,
  rating,
}: {
  product: CardProduct;
  rating?: { avg_rating: number; review_count: number };
}) {
  const out = product.stock === 0;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className={`h-full w-full object-cover transition group-hover:scale-105 ${out ? "opacity-60" : ""}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
        )}
        {out && (
          <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
          {product.categories?.name ?? "Uncategorised"}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-gray-900">{product.name}</h3>

        <div className="mt-2 flex h-5 items-center gap-1.5 text-xs text-gray-500">
          {rating ? (
            <>
              <Stars value={rating.avg_rating} className="text-sm" />
              <span>({rating.review_count})</span>
            </>
          ) : (
            <span className="text-gray-400">No reviews yet</span>
          )}
        </div>

        <p className="mt-auto pt-3 text-lg font-bold text-gray-900">{rupees(product.price)}</p>
      </div>
    </Link>
  );
}
