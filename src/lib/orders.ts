export const STATUS_LABEL: Record<string, string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STYLE: Record<string, string> = {
  processing: "bg-amber-50 text-amber-700",
  shipped: "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export const PAYMENT_LABEL: Record<string, string> = {
  card: "Card (test mode)",
  upi: "UPI (test mode)",
  cod: "Cash on delivery",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Payment due on delivery",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

export type Address = {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

export function overallStatus(statuses: string[]) {
  if (statuses.length > 0 && statuses.every((s) => s === "cancelled")) return "cancelled";
  const live = statuses.filter((s) => s !== "cancelled");
  if (live.some((s) => s === "processing")) return "processing";
  if (live.some((s) => s === "shipped")) return "shipped";
  return "delivered";
}

export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
