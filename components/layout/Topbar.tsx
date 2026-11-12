"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Bell,
  ChevronDown,
  Database,
  LogOut,
  Shield,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TopbarProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenMobileAI?: () => void;
}

export function Topbar({
  searchQuery = "",
  onSearchChange,
  onOpenMobileAI,
}: TopbarProps) {
  const { data: session } = useSession();
  const user = session?.user;

  const initials = React.useMemo(() => {
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "";
  }, [user]);

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-3.5 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 min-w-0">
      {/* Left: Glass Pill Search Input */}
      <div className="relative w-28 xs:w-36 sm:w-56 md:w-72 shrink-0">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search"
          aria-label="Search assets, signals, or memories"
          className="glass-pill h-9 sm:h-10 w-full rounded-full pl-3.5 pr-8 sm:pl-4 sm:pr-10 text-xs sm:text-sm text-white placeholder:text-fg-3 outline-none transition-colors focus:border-electric/60"
        />
        <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 sm:size-4 -translate-y-1/2 text-fg-2" />
      </div>

      {/* Right: Bell, Mobile AI trigger (<1280px), User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileAI}
          aria-label="Open SignalRecall AI Assistant"
          className="xl:hidden glass-pill inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 text-xs font-medium text-white hover:bg-white/[0.08]"
        >
          <span className="ring-conic inline-flex size-4 items-center justify-center rounded-full p-[1px]">
            <span className="size-full rounded-full bg-[#070814]" />
          </span>
          <span className="hidden md:inline">AI Partner</span>
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="glass-pill relative inline-flex size-9 sm:size-10 items-center justify-center rounded-full text-fg-2 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
        >
          <Bell className="size-3.5 sm:size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-electric" />
        </button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="User account menu"
                className="glass-pill flex items-center gap-2 rounded-full py-1 pl-1 sm:pl-1.5 pr-2 sm:pr-3 text-left hover:bg-white/[0.08] transition-colors shrink-0"
              >
                <div className="relative size-7 sm:size-8 rounded-full overflow-hidden bg-gradient-to-tr from-[#2F6BFF] to-[#6D5EF5] p-[1.5px] shrink-0">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={user.name || user.email || "Google account"}
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-full bg-ink text-[11px] sm:text-xs font-semibold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="hidden lg:block leading-tight min-w-0 max-w-[140px]">
                  {user.name && (
                    <div className="text-xs font-medium text-white truncate">
                      {user.name}
                    </div>
                  )}
                  {user.email && (
                    <div className="text-[10px] text-fg-3 truncate">
                      {user.email}
                    </div>
                  )}
                </div>
                <ChevronDown className="size-3 sm:size-3.5 text-fg-2 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <div className="px-2.5 py-2 border-b border-white/10 mb-1">
                {user.name && (
                  <div className="text-xs font-semibold text-white truncate">
                    {user.name}
                  </div>
                )}
                {user.email && (
                  <div className="text-[11px] text-fg-3 truncate">
                    {user.email}
                  </div>
                )}
              </div>

              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                  <Layers className="size-3.5 text-fg-2" />
                  <span>Dashboard Workspace</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/signals" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="size-3.5 text-fg-2" />
                  <span>My Trading Signals</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/memory" className="flex items-center gap-2 cursor-pointer">
                  <Database className="size-3.5 text-fg-2" />
                  <span>Walrus Memory Bank</span>
                </Link>
              </DropdownMenuItem>

              <div className="my-1 border-t border-white/10" />

              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer flex items-center gap-2"
              >
                <LogOut className="size-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
