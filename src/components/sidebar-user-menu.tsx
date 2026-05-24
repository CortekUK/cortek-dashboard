"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, Users } from "lucide-react";

import type { Profile } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string | null | undefined, email: string) {
  const source = (name || email).trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || source[0].toUpperCase();
}

const ROLE_LABEL: Record<Profile["role"], string> = {
  super_admin: "Super admin",
  manager: "Manager",
  dev: "Developer",
};

export function SidebarUserMenu({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const displayName = profile.full_name?.trim() || profile.email.split("@")[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="group/user mx-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
          >
            <Avatar size="sm" className="size-7">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-[10px] font-medium">
                {initials(profile.full_name, profile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-xs font-medium">{displayName}</span>
              <span className="truncate text-[10px] text-muted-foreground">
                {ROLE_LABEL[profile.role]}
              </span>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-medium leading-tight">{displayName}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {profile.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <Settings className="size-4" />
          <span>Profile settings</span>
        </DropdownMenuItem>
        {profile.role === "super_admin" && (
          <DropdownMenuItem render={<Link href="/admin/users" />}>
            <Users className="size-4" />
            <span>User management</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} disabled={signingOut}>
          <LogOut className="size-4" />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
