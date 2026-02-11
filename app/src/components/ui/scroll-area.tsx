import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.400)_transparent]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

