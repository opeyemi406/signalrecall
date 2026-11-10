"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "tint" | "blue";
  interactive?: boolean;
  as?: "div" | "section" | "article";
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", interactive = false, as: Comp = "div", children, ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(
          "glass p-4 sm:p-6 min-w-0 max-w-full",
          variant === "tint" && "glass-tint",
          variant === "blue" && "glass-blue",
          interactive && "glass-interactive",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
GlassCard.displayName = "GlassCard";
