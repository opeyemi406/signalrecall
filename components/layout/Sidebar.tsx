"use client";

import * as React from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  Terminal,
  PieChart,
  Radio,
  Database,
  Clock,
} from "lucide-react";
import { LiquidHighlight } from "@/components/LiquidHighlight";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/markets", label: "Market Intelligence", icon: TrendingUp },
  { href: "/signals", label: "Signals", icon: Terminal },
  { href: "/track-record", label: "Track Record", icon: PieChart },
  { href: "/alerts", label: "Alerts", icon: Radio },
  { href: "/memory", label: "Memory Bank", icon: Database },
  { href: "/history", label: "History", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary navigation"
      className="flex h-full w-14 sm:w-16 lg:w-[210px] shrink-0 flex-col justify-between py-5 sm:py-6 pl-2 pr-1.5 sm:pl-3 sm:pr-2 lg:px-4 select-none"
    >
      <div>
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-2 lg:px-3 pb-7 focus-visible:outline-electric"
        >
          <LogoMark size={28} id="sidebarLogoMark" />
          <span className="hidden lg:inline text-[18px] font-semibold tracking-tight text-white">
            SignalRecall
          </span>
        </Link>

        {/* Section Header */}
        <div className="hidden lg:block px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-3">
          MAIN
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={isActive ? "page" : undefined}
                className="block rounded-full focus-visible:outline-electric"
              >
                <LiquidHighlight
                  active={isActive}
                  hoverable={!isActive}
                  rounded="full"
                  className={cn(
                    "flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 text-[14px] font-medium transition-colors",
                    isActive ? "text-white" : "text-fg-2 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-white" : "text-fg-2"
                    )}
                  />
                  <span className="hidden lg:inline truncate">{item.label}</span>
                </LiquidHighlight>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
