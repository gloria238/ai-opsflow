"use client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface OrgSwitcherProps {
  currentOrg: { name: string; slug: string };
  orgs: { id: string; name: string; slug: string; role: string }[];
  onSwitch: (slug: string) => void;
}

export function OrgSwitcher({ currentOrg, orgs, onSwitch }: OrgSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium">
          <span>{currentOrg.name}</span>
          <span className="text-xs text-gray-400">▼</span>
        </div>
      </DropdownMenuTrigger>
      <div style={{ position: "relative" }}>
        <DropdownMenuContent>
          <div className="px-3 py-1.5 text-xs text-gray-500 font-medium">Organizations</div>
          {orgs.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => onSwitch(org.slug)}>
              <div className="flex items-center justify-between w-full">
                <span>{org.name}</span>
                {org.slug === currentOrg.slug && <span className="text-xs text-blue-600">✓</span>}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
