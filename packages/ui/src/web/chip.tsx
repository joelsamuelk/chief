import { cn } from "./utils";

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function Chip({ label, active = false, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-pill px-4 text-[13px] font-medium transition-all",
        active ? "bg-chipActiveBg text-chipActiveText" : "bg-chipBg text-textSecondary"
      )}
      type="button"
    >
      {label}
    </button>
  );
}
