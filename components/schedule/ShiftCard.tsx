import type { Shift } from "@/types/api";
import {
  formatShiftDate,
  formatShiftTime,
  getShiftTypeLabel,
  getStatusCardClass,
} from "@/lib/schedule";

type ShiftCardProps = {
  shift: Shift;
  onClick?: () => void;
};

export function ShiftCard({ shift, onClick }: ShiftCardProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full p-4 text-left ${getStatusCardClass(shift.type)} ${
        onClick
          ? "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {getShiftTypeLabel(shift.type)} — {shift.unit}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatShiftDate(shift.date)} ·{" "}
            {formatShiftTime(shift.startTime, shift.endTime)}
          </p>
        </div>
        <span className="shrink-0 text-xs capitalize text-muted-foreground">
          {shift.status}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {shift.durationHours}h scheduled
      </p>
    </Wrapper>
  );
}
