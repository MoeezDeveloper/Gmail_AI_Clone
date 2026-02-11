import * as React from "react";
import { cn } from "@/lib/utils";

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className, ...props }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col border-r border-indigo-100/50 bg-gradient-to-b from-white/90 to-indigo-50/50 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

