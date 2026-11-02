import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "buyer" | "seller";

export const HOME: Record<Role, string> = {
  buyer: "/buyer/account",
  seller: "/seller/dashboard",
};

// Call at the top of any protected page.
// - not logged in            -> sent to that portal's login page
// - logged in with wrong role -> sent to their own portal
export async function requireRole(role: Role) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${role}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, shop_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect(`/${role}/login`);
  if (profile.role !== role) redirect(HOME[profile.role as Role]);

  return { user, profile };
}
