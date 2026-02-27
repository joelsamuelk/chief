"use client";

import { motion } from "framer-motion";

interface SegmentedControlProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SegmentedControl({ value, options, onChange }: SegmentedControlProps) {
  return (
    <div className="inline-flex rounded-pill bg-chipBg p-1">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="relative min-h-11 min-w-20 overflow-hidden rounded-pill px-4 text-[13px] font-medium"
          >
            {selected ? (
              <motion.span
                layoutId="segmented-pill"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="absolute inset-0 rounded-pill bg-chipActiveBg"
              />
            ) : null}
            <span className={`relative z-10 ${selected ? "text-chipActiveText" : "text-textSecondary"}`}>
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}
