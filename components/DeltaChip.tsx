import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeltaChipProps {
  label: string;
  positive?: boolean;
  className?: string;
  showArrow?: boolean;
}

export function DeltaChip({ label, positive = true, className, showArrow = true }: DeltaChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium num border transition-colors max-w-full",
        positive
          ? "bg-[#19D49A]/12 text-[#19D49A] border-[#19D49A]/25"
          : "bg-[#FF4D5E]/12 text-[#FF4D5E] border-[#FF4D5E]/25",
        className
      )}
    >
      {showArrow &&
        (positive ? (
          <ArrowUpRight className="size-3 shrink-0" />
        ) : (
          <ArrowDownRight className="size-3 shrink-0" />
        ))}
      <span className="truncate">{label}</span>
    </span>
  );
}
