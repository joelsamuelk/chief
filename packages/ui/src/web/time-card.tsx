interface TimeCardProps {
  label: string;
  value: string;
  onClick?: () => void;
}

export function TimeCard({ label, value, onClick }: TimeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-input border border-divider bg-bg px-4 py-3 text-left transition hover:shadow-sm"
    >
      <p className="text-[12px] font-medium text-textTertiary">{label}</p>
      <p className="mt-1 text-[16px] font-semibold text-textPrimary tabular-nums">{value}</p>
    </button>
  );
}
