"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/seller/dashboard", label: "Dashboard" },
  { href: "/seller/products", label: "My products" },
  { href: "/seller/products/new", label: "Add product" },
  { href: "/seller/orders", label: "Orders" },
];

export default function SellerNav() {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex gap-1 overflow-x-auto border-b">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
