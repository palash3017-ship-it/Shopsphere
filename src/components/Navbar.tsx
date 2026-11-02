import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HOME, type Role } from "@/lib/auth";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: Role | null = null;
  let name = "";
  let cartCount = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, shop_name")
      .eq("id", user.id)
      .single();
    role = (profile?.role as Role) ?? null;
    name = (role === "seller" ? profile?.shop_name : profile?.full_name) || user.email || "";

    if (role === "buyer") {
      const { data: cart } = await supabase.from("cart_items").select("quantity").eq("user_id", user.id);
      cartCount = (cart ?? []).reduce((sum, c) => sum + c.quantity, 0);
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
          Shop<span className="text-indigo-600">Sphere</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {user && role ? (
            <>
              {role === "buyer" && (
                <>
                  <Link href="/buyer/orders" className="hidden font-medium text-gray-700 hover:text-gray-900 sm:inline">
                    Orders
                  </Link>
                  <Link href="/buyer/cart" className="relative rounded-lg p-1.5 text-gray-700 hover:bg-gray-100" aria-label="Cart">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4a1 1 0 0 1 .97.76L5.1 6m0 0 1.6 7.2a1 1 0 0 0 .98.8h9.2a1 1 0 0 0 .97-.77l1.2-5.2A1 1 0 0 0 18.07 6H5.1Z" />
                      <circle cx="9" cy="19" r="1.2" />
                      <circle cx="17" cy="19" r="1.2" />
                    </svg>
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              <Link href={HOME[role]} className="font-medium text-gray-700 hover:text-gray-900">
                {role === "seller" ? "Seller dashboard" : "My account"}
              </Link>
              <span className="hidden max-w-[10rem] truncate text-gray-500 md:inline">{name}</span>
              <form action="/auth/signout" method="post">
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/seller/login" className="font-medium text-gray-600 hover:text-gray-900">
                Sell on ShopSphere
              </Link>
              <Link href="/buyer/login" className="rounded-lg px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100">
                Log in
              </Link>
              <Link href="/buyer/signup" className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
