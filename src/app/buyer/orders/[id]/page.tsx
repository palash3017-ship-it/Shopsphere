import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import {
  STATUS_LABEL,
  STATUS_STYLE,
  PAYMENT_LABEL,
  PAYMENT_STATUS_LABEL,
  shortId,
  formatDate,
  type Address,
} from "@/lib/orders";
import CancelItemButton from "@/components/CancelItemButton";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  status: string;
  product_id: string | null;
  products: { image_url: string | null } | null;
};
type Order = {
  id: string;
  total_amount: number;
  shipping_address: Address;
  payment_status: string;
  payment_method: string;
  payment_ref: string | null;
  created_at: string;
  order_items: Item[];
};

const STEPS = ["processing", "shipped", "delivered"];

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  const { user } = await requireRole("buyer");
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, total_amount, shipping_address, payment_status, payment_method, payment_ref, created_at, order_items(id, name, quantity, unit_price, status, product_id, products(image_url))"
    )
    .eq("id", id)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (!data) notFound();
  const order = data as unknown as Order;
  const a = order.shipping_address;

  return (
    <div className="mx-auto max-w-4xl py-10">
      {placed && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-6 text-emerald-800">
          <p className="text-xl font-bold">🎉 Thank you! Your order has been placed.</p>
          <p className="mt-1 text-sm">
            The seller has been notified. You can track every item on this page.
          </p>
        </div>
      )}

      <Link href="/buyer/orders" className="text-sm font-medium text-indigo-600 hover:underline">
        ← All orders
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Order #{shortId(order.id)}</h1>
      <p className="text-sm text-gray-500">Placed on {formatDate(order.created_at)}</p>

      <ul className="mt-6 space-y-4">
        {order.order_items.map((i) => {
          const stepIndex = STEPS.indexOf(i.status);
          return (
            <li key={i.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {i.products?.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.products.image_url} alt={i.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {i.product_id ? (
                      <Link href={`/product/${i.product_id}`} className="font-semibold hover:text-indigo-600">
                        {i.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{i.name}</span>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {rupees(Number(i.unit_price))} × {i.quantity} = <span className="font-semibold text-gray-900">{rupees(Number(i.unit_price) * i.quantity)}</span>
                  </p>

                  {i.status !== "cancelled" && (
                    <div className="mt-4 flex items-center">
                      {STEPS.map((s, idx) => (
                        <div key={s} className="flex flex-1 items-center last:flex-none">
                          <div className="flex flex-col items-center">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${idx <= stepIndex ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                              {idx <= stepIndex ? "✓" : idx + 1}
                            </span>
                            <span className="mt-1 text-xs text-gray-500">{STATUS_LABEL[s]}</span>
                          </div>
                          {idx < STEPS.length - 1 && <div className={`mx-2 mb-5 h-0.5 flex-1 ${idx < stepIndex ? "bg-emerald-600" : "bg-gray-200"}`} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {i.status === "processing" && (
                    <div className="mt-3">
                      <CancelItemButton itemId={i.id} />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 text-sm shadow-sm">
          <p className="font-semibold">Delivery address</p>
          <p className="mt-2 text-gray-600">
            {a.full_name}
            <br />
            {a.line1}
            {a.line2 ? `, ${a.line2}` : ""}
            <br />
            {a.city}, {a.state} {a.pincode}
            <br />
            Phone: {a.phone}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5 text-sm shadow-sm">
          <p className="font-semibold">Payment</p>
          <p className="mt-2 text-gray-600">{PAYMENT_LABEL[order.payment_method]}</p>
          <p className="font-medium text-gray-900">{PAYMENT_STATUS_LABEL[order.payment_status]}</p>
          {order.payment_ref && <p className="mt-1 text-xs text-gray-400">Ref: {order.payment_ref}</p>}
        </div>
        <div className="rounded-2xl border bg-white p-5 text-sm shadow-sm">
          <p className="font-semibold">Order total</p>
          <p className="mt-2 text-3xl font-extrabold">{rupees(Number(order.total_amount))}</p>
          <p className="text-gray-500">Delivery: Free</p>
        </div>
      </div>
    </div>
  );
}
