import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-indigo-100/50 bg-white/90 text-slate-900 shadow-xl shadow-indigo-500/5 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-indigo-100/50 p-4", className)}
      {...props}
    />
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn("text-base font-bold leading-none tracking-tight text-slate-800", className)}
      {...props}
    />
  );
}

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div className={cn("p-4 text-sm text-slate-600", className)} {...props} />
  );
}

