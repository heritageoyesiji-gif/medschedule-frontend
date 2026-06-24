"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/schedule";

type MonthNavigatorProps = {
  month: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function MonthNavigator({
  month,
  onPrevious,
  onNext,
  onToday,
}: MonthNavigatorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-foreground md:text-xl">
        {formatMonthLabel(month)}
      </h2>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPrevious}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNext}
          aria-label="Next month"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
