import * as React from "react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "left" | "right";
  children: React.ReactNode;
}

export function Sheet({
  open,
  onOpenChange,
  side = "left",
  children,
}: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <button
        aria-label="Close sheet"
        className="absolute inset-0 bg-black/30"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        className={cn(
          "relative z-50 flex h-full w-72 max-w-full flex-col border-r border-zinc-200 bg-white shadow-lg",
          side === "right" && "ml-auto border-l border-r-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

