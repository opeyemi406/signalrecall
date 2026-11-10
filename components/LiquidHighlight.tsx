"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LiquidHighlightProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  hoverable?: boolean;
  rounded?: "full" | "2xl" | "xl";
}

/**
 * Signature "liquid" blue specular highlight used on the active sidebar pill
 * and highlighted/hovered table rows.
 */
export const LiquidHighlight = React.forwardRef<HTMLDivElement, LiquidHighlightProps>(
  ({ className, active = false, hoverable = false, rounded = "2xl", children, ...props }, ref) => {
    const radiusClass =
      rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-2xl";

    return (
      <div
        ref={ref}
        className={cn(
          "relative transition-all duration-200 min-w-0 max-w-full overflow-hidden",
          radiusClass,
          active && "liquid text-white",
          !active && hoverable && "hover:bg-white/[0.04]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
LiquidHighlight.displayName = "LiquidHighlight";
