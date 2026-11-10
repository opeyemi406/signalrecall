import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "glass-pill h-11 w-full rounded-full px-4 text-sm text-white placeholder:text-fg-3 outline-none transition-colors focus:border-electric/60 focus:shadow-[0_0_0_3px_rgb(47_107_255/0.2)] num",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
