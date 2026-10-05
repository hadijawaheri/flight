import { formatTomanNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TomanProps {
  rial: number;
  className?: string;
  unitClassName?: string;
}

/** The number carries the weight; the unit stays quiet beside it. */
export function Toman({ rial, className, unitClassName }: TomanProps) {
  return (
    <span className={cn("tnum inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <bdi className="font-extrabold">{formatTomanNumber(rial)}</bdi>
      <span className={cn("text-muted-foreground text-xs font-normal", unitClassName)}>تومان</span>
    </span>
  );
}
