"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import type { Address } from "@/lib/orders";

type SavedAddress = Address & { id: string };
type Method = "card" | "upi" | "cod";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EMPTY: Address = { full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

export default function CheckoutForm({
  addresses,
  defaultName,
  total,
}: {
  addresses: SavedAddress[];
  defaultName: string;
  total: number;
}) {
  const router = useRouter();

  const [selected, setSelected] = useState<string>(addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState<Address>({ ...EMPTY, full_name: defaultName });
  const [saveAddr, setSaveAddr] = useState(true);

  const [method, setMethod] = useState<Method>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [upi, setUpi] = useState("");

  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const input =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

  const setField = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));

  function validateAddress(a: Address) {
    if (!a.full_name.trim()) return "Enter the recipient's full name.";
    if (!/^\d{10}$/.test(a.phone.trim())) return "Enter a valid 10-digit mobile number.";
    if (!a.line1.trim()) return "Enter the address line 1.";
    if (!a.city.trim()) return "Enter the city.";
    if (!a.state.trim()) return "Enter the state.";
    if (!/^\d{6}$/.test(a.pincode.trim())) return "Enter a valid 6-digit pincode.";
    return null;
  }

  function validatePayment() {
    if (method === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (!/^\d{16}$/.test(digits)) return "Enter a valid 16-digit card number.";
      const m = expiry.match(/^(\d{2})\/(\d{2})$/);
      if (!m) return "Enter the card expiry as MM/YY.";
      const mm = Number(m[1]);
      const yy = Number(m[2]);
      const now = new Date();
      const curYY = now.getFullYear() % 100;
      if (mm < 1 || mm > 12 || yy < curYY || (yy === curYY && mm < now.getMonth() + 1)) return "This card has expired.";
      if (!/^\d{3,4}$/.test(cvv)) return "Enter the 3 or 4 digit CVV.";
    }
    if (method === "upi" && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim())) {
      return "Enter a valid UPI ID, for example name@bank.";
    }
    return null;
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const chosen = selected === "new" ? addr : addresses.find((a) => a.id === selected);
    if (!chosen) return setError("Please choose a delivery address.");
    const addrErr = validateAddress(chosen);
    if (addrErr) return setError(addrErr);
    const payErr = validatePayment();
    if (payErr) return setError(payErr);

    setProcessing(true);
    const supabase = createClient();

    try {
      // Simulated payment (test mode): card/UPI details are never sent or stored anywhere
      if (method !== "cod") {
        await sleep(1600);
        if (method === "card" && cardNumber.replace(/\s/g, "").endsWith("0002")) {
          return setError("Your card was declined (test card). Please try a different card.");
        }
      }

      const shipping: Address = {
        full_name: chosen.full_name.trim(),
        phone: chosen.phone.trim(),
        line1: chosen.line1.trim(),
        line2: chosen.line2?.trim() || null,
        city: chosen.city.trim(),
        state: chosen.state.trim(),
        pincode: chosen.pincode.trim(),
      };

      // Save the new address for next time (best effort)
      if (selected === "new" && saveAddr) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) await supabase.from("addresses").insert({ ...shipping, user_id: user.id });
      }

      const { data: orderId, error: rpcErr } = await supabase.rpc("place_order", {
        p_address: shipping,
        p_payment_method: method,
      });
      if (rpcErr) return setError(rpcErr.message);

      router.push(`/buyer/orders/${orderId}?placed=1`);
      router.refresh();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={placeOrder} className="space-y-8">
      {/* 1. Address */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">1. Delivery address</h2>

        {addresses.length > 0 && (
          <div className="mt-4 space-y-3">
            {addresses.map((a) => (
              <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${selected === a.id ? "border-indigo-600 bg-indigo-50/50" : "hover:border-gray-400"}`}>
                <input type="radio" name="addr" checked={selected === a.id} onChange={() => setSelected(a.id)} className="mt-1 accent-indigo-600" />
                <div className="text-sm">
                  <p className="font-semibold">{a.full_name} <span className="font-normal text-gray-500">· {a.phone}</span></p>
                  <p className="text-gray-600">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                  </p>
                </div>
              </label>
            ))}
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-medium ${selected === "new" ? "border-indigo-600 bg-indigo-50/50" : "hover:border-gray-400"}`}>
              <input type="radio" name="addr" checked={selected === "new"} onChange={() => setSelected("new")} className="accent-indigo-600" />
              Use a new address
            </label>
          </div>
        )}

        {selected === "new" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Full name</label>
              <input className={input} value={addr.full_name} onChange={setField("full_name")} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Mobile number</label>
              <input className={input} inputMode="numeric" maxLength={10} value={addr.phone} onChange={setField("phone")} placeholder="10-digit number" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Address line 1</label>
              <input className={input} value={addr.line1} onChange={setField("line1")} placeholder="House no., building, street" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Address line 2 (optional)</label>
              <input className={input} value={addr.line2 ?? ""} onChange={setField("line2")} placeholder="Area, landmark" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <input className={input} value={addr.city} onChange={setField("city")} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">State</label>
              <input className={input} value={addr.state} onChange={setField("state")} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Pincode</label>
              <input className={input} inputMode="numeric" maxLength={6} value={addr.pincode} onChange={setField("pincode")} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              Save this address for next time
            </label>
          </div>
        )}
      </section>

      {/* 2. Payment */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">2. Payment</h2>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">TEST MODE: no real money is charged</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {([
            ["card", "Card"],
            ["upi", "UPI"],
            ["cod", "Cash on delivery"],
          ] as [Method, string][]).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setMethod(key)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${method === key ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "text-gray-700 hover:border-gray-400"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {method === "card" && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Card number</label>
              <input
                className={input}
                inputMode="numeric"
                placeholder="4111 1111 1111 1111"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                autoComplete="off"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Name on card</label>
              <input className={input} value={cardName} onChange={(e) => setCardName(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Expiry (MM/YY)</label>
              <input
                className={input}
                inputMode="numeric"
                placeholder="12/30"
                value={expiry}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                }}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">CVV</label>
              <input className={input} type="password" inputMode="numeric" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} autoComplete="off" />
            </div>
            <p className="text-xs text-gray-400 sm:col-span-2">
              Test cards: <b>4111 1111 1111 1111</b> succeeds, <b>4000 0000 0000 0002</b> is declined. Any future expiry and any CVV work.
            </p>
          </div>
        )}

        {method === "upi" && (
          <div className="mt-5">
            <label className="text-sm font-medium text-gray-700">UPI ID</label>
            <input className={input} placeholder="name@bank" value={upi} onChange={(e) => setUpi(e.target.value)} autoComplete="off" />
            <p className="mt-1 text-xs text-gray-400">Test mode: any valid-looking UPI ID is accepted.</p>
          </div>
        )}

        {method === "cod" && (
          <p className="mt-5 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            You will pay in cash when the order is delivered.
          </p>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={processing}
        className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-base font-bold text-white transition hover:bg-indigo-700 disabled:opacity-70"
      >
        {processing ? (method === "cod" ? "Placing your order..." : "Processing payment...") : method === "cod" ? `Place order · ${rupees(total)}` : `Pay ${rupees(total)} (test)`}
      </button>
    </form>
  );
}
