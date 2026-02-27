import type { ReactNode } from "react";
import { cn } from "./utils";

interface ListRowProps {
  left: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ left, title, subtitle, right, onClick, className }: ListRowProps) {
  const baseClass = cn(
    "flex min-h-[58px] w-full items-center gap-3 rounded-cardMd px-3 text-left",
    onClick ? "transition-transform duration-150 hover:scale-[0.997] active:scale-[0.992]" : "",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {left}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-textPrimary">{title}</p>
          {subtitle ? <p className="truncate text-[12px] font-medium text-textSecondary">{subtitle}</p> : null}
        </div>
        {right}
      </button>
    );
  }

  return (
    <div className={baseClass}>
      {left}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold text-textPrimary">{title}</p>
        {subtitle ? <p className="truncate text-[12px] font-medium text-textSecondary">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
