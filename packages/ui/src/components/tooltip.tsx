import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/** Minimal hover/focus tooltip. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && content ? (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute start-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md rtl:translate-x-1/2",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
