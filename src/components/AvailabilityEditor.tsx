import { DAYS, TimeRange, WeeklyAvailability } from "../types";
import { buildTimeSlots } from "../lib/time";
import { dayShort, useLanguage, useT } from "../lib/i18n";

interface AvailabilityEditorProps {
  value: WeeklyAvailability | undefined;
  onChange: (value: WeeklyAvailability | undefined) => void;
  /** Etiqueta del interruptor maestro (p. ej. "Limitar el horario de la pista"). */
  limitLabel: string;
  /** Texto cuando no hay limite (p. ej. "Sin limite: abierta a cualquier hora."). */
  noLimitHint: string;
  defaultRange: TimeRange;
}

const TIME_OPTIONS = buildTimeSlots("06:00", "24:00", 30);

function rangeOf(value: WeeklyAvailability, dayId: string): TimeRange | undefined {
  return (value as Record<string, TimeRange[]>)[dayId]?.[0];
}

export function AvailabilityEditor({ value, onChange, limitLabel, noLimitHint, defaultRange }: AvailabilityEditorProps) {
  const t = useT();
  const lang = useLanguage();
  const limited = value !== undefined;

  const toggleLimit = (on: boolean) => {
    if (!on) {
      onChange(undefined);
      return;
    }
    // Al activar el limite, abrir todos los dias con la franja por defecto.
    const next: WeeklyAvailability = {};
    for (const day of DAYS) {
      next[day.id] = [{ ...defaultRange }];
    }
    onChange(next);
  };

  const patchDay = (dayId: string, range: TimeRange | null) => {
    const next: WeeklyAvailability = { ...(value ?? {}) };
    if (range) {
      (next as Record<string, TimeRange[]>)[dayId] = [range];
    } else {
      delete (next as Record<string, TimeRange[]>)[dayId];
    }
    onChange(next);
  };

  return (
    <div className="avail-editor">
      <label className="check-row">
        <input type="checkbox" checked={limited} onChange={(event) => toggleLimit(event.target.checked)} />
        {limitLabel}
      </label>

      {!limited ? (
        <p className="avail-editor__hint">{noLimitHint}</p>
      ) : (
        <div className="avail-grid">
          {DAYS.map((day) => {
            const range = value ? rangeOf(value, day.id) : undefined;
            const enabled = Boolean(range);
            return (
              <div className={`avail-row${enabled ? "" : " avail-row--off"}`} key={day.id}>
                <label className="avail-row__day">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => patchDay(day.id, event.target.checked ? { ...defaultRange } : null)}
                  />
                  {dayShort(lang, day.id)}
                </label>
                <select
                  value={range?.start ?? defaultRange.start}
                  disabled={!enabled}
                  onChange={(event) => patchDay(day.id, { start: event.target.value, end: range?.end ?? defaultRange.end })}
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span className="avail-row__sep">{t("avail.to")}</span>
                <select
                  value={range?.end ?? defaultRange.end}
                  disabled={!enabled}
                  onChange={(event) => patchDay(day.id, { start: range?.start ?? defaultRange.start, end: event.target.value })}
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
