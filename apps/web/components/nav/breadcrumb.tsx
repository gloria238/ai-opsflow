"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  workflows: "Workflows",
  leads: "Leads",
  runs: "Runs",
  settings: "Settings",
  "audit-log": "Audit Log",
  builder: "Builder",
  members: "Members",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Home/dashboard
  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-zinc-400">
        <Home className="size-3.5" />
        <span className="text-zinc-900 font-medium">Dashboard</span>
      </div>
    );
  }

  const items = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    let label = LABELS[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    // For UUID segments (like workflow/lead IDs), show a shortened version
    if (/^[0-9a-f-]{20,}$/i.test(seg)) {
      label = seg.slice(0, 8) + "...";
    }
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Link href="/" className="text-zinc-400 hover:text-zinc-600 transition-colors">
        <Home className="size-3.5" />
      </Link>
      {items.map((item) => (
        <span key={item.href} className="flex items-center gap-1">
          <ChevronRight className="size-3 text-zinc-300" />
          {item.isLast ? (
            <span className="text-zinc-900 font-medium">{item.label}</span>
          ) : (
            <Link href={item.href} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
