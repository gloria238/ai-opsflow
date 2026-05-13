"use client";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { useCallback } from "react";

interface UserMenuProps {
  user: { name: string; email: string };
  org: { name: string; slug: string };
}

export function UserMenu({ user, org }: UserMenuProps) {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-zinc-100 transition-colors">
            <Avatar name={user.name} />
            <div className="text-left">
              <div className="text-sm font-medium text-zinc-800 leading-tight">{user.name}</div>
              <div className="text-[11px] text-zinc-400 leading-tight">{org.name}</div>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-100">{user.email}</div>
          <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
