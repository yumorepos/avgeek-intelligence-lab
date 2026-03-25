import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Intel Hub" },
  { href: "/intelligence/route-changes", label: "Route Changes" },
  { href: "/intelligence/airports", label: "Airport Roles" },
  { href: "/intelligence/competition", label: "Competition" },
  { href: "/airports", label: "Airport Profiles" },
  { href: "/airlines", label: "Airlines (Demo)" },
  { href: "/network", label: "Network (Demo)" },
  { href: "/seasonality", label: "Seasonality (Demo)" },
  { href: "/learn", label: "Methodology" },
  { href: "/data-status", label: "Data Status" },
];

export function AppNav() {
  return (
    <header className="bg-white border-b border-orange-200 sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-700 font-bold">Avgeek Intelligence Lab</p>
          <p className="text-sm text-gray-600">Truth-first aviation intelligence with explicit runtime modes</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
