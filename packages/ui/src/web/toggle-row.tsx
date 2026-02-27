"use client";

import * as Switch from "@radix-ui/react-switch";

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function ToggleRow({ label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex min-h-14 items-center justify-between rounded-cardMd px-1">
      <span className="text-[16px] text-textPrimary">{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 rounded-full bg-divider transition data-[state=checked]:bg-chipActiveBg"
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition data-[state=checked]:translate-x-6" />
      </Switch.Root>
    </div>
  );
}
