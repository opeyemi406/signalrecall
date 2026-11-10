"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn("glass z-50 min-w-[9rem] rounded-2xl bg-ink-2/90 p-1.5 text-sm", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn("flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2 text-fg-2 outline-none data-[highlighted]:bg-white/[0.07] data-[highlighted]:text-white", className)}
      {...props}
    />
  );
}
