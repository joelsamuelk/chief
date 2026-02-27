import type { PropsWithChildren } from "react";
import { cn } from "./utils";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-cardLg bg-surface p-card shadow-card transition-shadow duration-200",
        "hover:shadow-[0_14px_28px_rgba(17,17,17,0.08),0_4px_8px_rgba(17,17,17,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}
