interface BrandGlyphProps {
  className?: string;
  ringClassName?: string;
  fillClassName?: string;
}

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function BrandGlyph({ className, ringClassName, fillClassName }: BrandGlyphProps) {
  return (
    <span className={classes("inline-flex items-center justify-center", className)}>
      <span
        className={classes(
          "inline-flex h-full w-full items-center justify-center rounded-full border-2 border-current",
          ringClassName
        )}
      >
        <span
          className={classes("h-[40%] w-[58%] rotate-[45deg] rounded-b-full bg-current", fillClassName)}
        />
      </span>
    </span>
  );
}

export function BrandLockup({
  markClassName,
  labelClassName,
  showDot = true
}: {
  markClassName?: string;
  labelClassName?: string;
  showDot?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <BrandGlyph className={classes("h-9 w-9 text-[#111]", markClassName)} />
      <span className={classes("text-[34px] leading-none font-semibold tracking-tight sm:text-[40px]", labelClassName)}>
        chief{showDot ? "." : ""}
      </span>
    </div>
  );
}
