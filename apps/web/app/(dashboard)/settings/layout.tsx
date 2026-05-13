import Link from "next/link";

const tabs = [
  { href: "/settings", label: "General" },
  { href: "/settings/members", label: "Members" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-800 border-b-2 border-transparent hover:border-gray-300 transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
