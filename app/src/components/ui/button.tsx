import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

