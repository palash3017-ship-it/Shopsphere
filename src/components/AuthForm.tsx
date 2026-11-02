"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "buyer" | "seller";
type Mode = "login" | "signup";

const HOME: Record<Role, string> = {
  buyer: "/buyer/account",
  seller: "/seller/dashboard",
};

const THEME = {
  buyer: {
    panel: "from-indigo-600 to-violet-700",
    button: "bg-indigo-600 hover:bg-indigo-700",
    ring: "focus:border-indigo-500 focus:ring-indigo-500",
    link: "text-indigo-600 hover:text-indigo-700",
    badge: "bg-indigo-50 text-indigo-700",
    headline: "Discover products you'll love",
    sub: "Shop from independent sellers, track every order and save your favourites.",
    points: ["Thousands of products", "Easy order tracking", "Secure checkout"],
  },
  seller: {
    panel: "from-emerald-600 to-teal-700",
    button: "bg-emerald-600 hover:bg-emerald-700",
    ring: "focus:border-emerald-500 focus:ring-emerald-500",
    link: "text-emerald-600 hover:text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
    headline: "Grow your business online",
    sub: "List products, manage stock and fulfil orders from one simple dashboard.",
    points: ["Free to start", "Sales and earnings insights", "Manage orders in one place"],
  },
} as const;

export default function AuthForm({ role, mode }: { role: Role; mode: Mode }) {
  const router = useRouter();
  const t = THEME[role];
  const isSignup = mode === "signup";

  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name: fullName,
              shop_name: role === "seller" ? shopName : null,
            },
          },
        });
        if (error) return setError(error.message);

        // Supabase returns an empty identities list when the email is already registered
        if (data.user && data.user.identities?.length === 0) {
          return setError("An account with this email already exists. Please log in.");
        }
        if (!data.session) {
          return setInfo("Account created! Check your email to confirm it, then log in.");
        }
        router.push(HOME[role]);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setError(error.message);

        // Make sure this person is logging in through the right portal
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role !== role) {
          await supabase.auth.signOut();
          const other = role === "buyer" ? "seller" : "buyer";
          return setError(
            `This email belongs to a ${other} account. Please use the ${other} login instead.`
          );
        }
        router.push(HOME[role]);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const otherRole: Role = role === "buyer" ? "seller" : "buyer";
  const inputClass = `mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm outline-none focus:ring-1 ${t.ring}`;

  return (
    <div className="mx-auto my-10 grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
      {/* Left: brand panel */}
      <div className={`hidden bg-gradient-to-br ${t.panel} p-10 text-white md:flex md:flex-col md:justify-between`}>
        <div className="text-2xl font-bold tracking-tight">ShopSphere</div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">{t.headline}</h2>
          <p className="mt-3 text-white/80">{t.sub}</p>
          <ul className="mt-6 space-y-2 text-sm text-white/90">
            {t.points.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">© ShopSphere. College project.</p>
      </div>

      {/* Right: form */}
      <div className="p-8 sm:p-10">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${t.badge}`}>
          {role} portal
        </span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {isSignup ? `Create your ${role} account` : `Welcome back, ${role}`}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isSignup ? "It only takes a minute." : "Log in to continue."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <div>
              <label className="text-sm font-medium text-gray-700">Full name</label>
              <input className={inputClass} required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          {isSignup && role === "seller" && (
            <div>
              <label className="text-sm font-medium text-gray-700">Shop name</label>
              <input className={inputClass} required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Palash Electronics" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" className={inputClass} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input type="password" className={inputClass} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {info && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg px-4 py-2.5 font-semibold text-white transition disabled:opacity-60 ${t.button}`}
          >
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link className={`font-semibold ${t.link}`} href={`/${role}/${isSignup ? "login" : "signup"}`}>
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>

        <div className="mt-6 border-t pt-4 text-center text-sm text-gray-500">
          Looking for the {otherRole} portal?{" "}
          <Link className={`font-semibold ${t.link}`} href={`/${otherRole}/${mode}`}>
            Go to {otherRole} {isSignup ? "signup" : "login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
