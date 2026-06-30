import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Language } from "../types";
import { formatWeekRange } from "../lib/dates";
import { useT } from "../lib/i18n";

interface WeekBarProps {
  weekStart: string;
  language: Language;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekBar({ weekStart, language, onPrev, onNext, onToday }: WeekBarProps) {
  const t = useT();
  return (
    <div className="week-bar">
      <button className="icon-button" type="button" onClick={onPrev} aria-label={t("week.prev")}>
        <ChevronLeft size={18} />
      </button>
      <span className="week-bar__label">
        <CalendarRange size={15} />
        {formatWeekRange(weekStart, language)}
      </span>
      <button className="icon-button" type="button" onClick={onNext} aria-label={t("week.next")}>
        <ChevronRight size={18} />
      </button>
      <button className="small-button week-bar__today" type="button" onClick={onToday}>
        {t("week.today")}
      </button>
    </div>
  );
}
