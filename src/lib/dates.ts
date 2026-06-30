import { DAYS, DayId, Language } from "../types";

// Trabajamos con fechas ISO "YYYY-MM-DD" en hora local para evitar saltos de
// dia por zona horaria (no usamos new Date(iso) directamente).

function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

const dayOffset: Record<DayId, number> = DAYS.reduce(
  (acc, day, index) => ({ ...acc, [day.id]: index }),
  {} as Record<DayId, number>,
);

export function todayISO(): string {
  return toISO(new Date());
}

/** Lunes (inicio de semana) de la semana que contiene la fecha dada. */
export function mondayOfISO(iso: string): string {
  const date = fromISO(iso);
  const back = (date.getDay() + 6) % 7; // dias transcurridos desde el lunes
  date.setDate(date.getDate() - back);
  return toISO(date);
}

export function addDaysISO(iso: string, days: number): string {
  const date = fromISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function addWeeksISO(iso: string, weeks: number): string {
  return addDaysISO(iso, weeks * 7);
}

/** Fecha ISO del dia indicado dentro de la semana que empieza en weekStart. */
export function dateForDay(weekStart: string, day: DayId): string {
  return addDaysISO(weekStart, dayOffset[day] ?? 0);
}

export function dayOfMonth(iso: string): number {
  return fromISO(iso).getDate();
}

function localeFor(lang: Language): string {
  return lang === "eu" ? "eu-ES" : "es-ES";
}

/** Etiqueta de un rango de semana, p. ej. "13 ene - 19 ene 2026". */
export function formatWeekRange(weekStart: string, lang: Language): string {
  const start = fromISO(weekStart);
  const end = fromISO(addDaysISO(weekStart, 6));
  const locale = localeFor(lang);
  const startStr = start.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  return `${startStr} - ${endStr}`;
}
