import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border-2 border-indigo-200/50 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 hover:border-indigo-300 focus:border-indigo-400 focus:shadow-lg focus:shadow-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

