"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Intel Hub" },
  { href: "/intelligence/route-changes", label: "Routes" },
  { href: "/intelligence/airports", label: "Airports" },
  { href: "/intelligence/competition", label: "Competition" },
  { href: "/airports", label: "Airport Profiles" },
  { href: "/airlines", label: "Airlines", demo: true },
  { href: "/network", label: "Network", demo: true },
  { href: "/seasonality", label: "Seasonality", demo: true },
  { href: "/learn", label: "Methodology" },
  { href: "/data-status", label: "Data Status" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className="bg-white border-b border-orange-200 sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-700 font-bold">Avgeek Intelligence Lab</p>
          <p className="text-sm text-gray-600">Truth-first aviation intelligence</p>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                      : "text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  {item.label}
                  {item.demo ? <span className="soft-label">Demo</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
