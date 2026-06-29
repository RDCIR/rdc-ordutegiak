import { DAYS, DayId, WeekConfig, WeeklyAvailability } from "../types";

export function timeToMinutes(time?: string | null): number | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number): string {
  return minutesToTime((timeToMinutes(time) ?? 0) + minutes);
}

export function durationMinutes(start?: string | null, end?: string | null): number {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return 60;
  }
  return endMinutes - startMinutes;
}

export function rangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  const aStart = timeToMinutes(firstStart);
  const aEnd = timeToMinutes(firstEnd);
  const bStart = timeToMinutes(secondStart);
  const bEnd = timeToMinutes(secondEnd);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return false;
  }
  return aStart < bEnd && bStart < aEnd;
}

export function getDayVisibleRange(config: WeekConfig, day: DayId) {
  const dayDefinition = DAYS.find((entry) => entry.id === day);
  const isWeekend = dayDefinition?.kind === "weekend";
  return {
    start: isWeekend ? config.weekendStart : config.weekdayStart,
    end: isWeekend ? config.weekendEnd : config.weekdayEnd,
  };
}

export function getGlobalVisibleRange(config: WeekConfig) {
  const starts = config.daysVisible.map((day) => timeToMinutes(getDayVisibleRange(config, day).start) ?? 0);
  const ends = config.daysVisible.map((day) => timeToMinutes(getDayVisibleRange(config, day).end) ?? 0);
  return {
    start: minutesToTime(Math.min(...starts)),
    end: minutesToTime(Math.max(...ends)),
  };
}

export function buildTimeSlots(start: string, end: string, blockMinutes: number): string[] {
  const startMinutes = timeToMinutes(start) ?? 0;
  const endMinutes = timeToMinutes(end) ?? startMinutes;
  const slots: string[] = [];
  for (let cursor = startMinutes; cursor < endMinutes; cursor += blockMinutes) {
    slots.push(minutesToTime(cursor));
  }
  return slots;
}

export function isSessionInsideVisibleHours(
  day: DayId,
  startTime: string,
  endTime: string,
  config: WeekConfig,
): boolean {
  const visible = getDayVisibleRange(config, day);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const visibleStart = timeToMinutes(visible.start);
  const visibleEnd = timeToMinutes(visible.end);
  if (start === null || end === null || visibleStart === null || visibleEnd === null) {
    return false;
  }
  return start >= visibleStart && end <= visibleEnd;
}

/**
 * Comprueba si el intervalo [start, end] cabe entero dentro de alguna franja
 * disponible ese dia. `availability` sin definir = sin restriccion (true).
 * Definida pero sin franjas ese dia = no disponible (false).
 */
export function fitsInAvailability(
  availability: WeeklyAvailability | undefined,
  day: DayId,
  startTime: string,
  endTime: string,
): boolean {
  if (!availability) {
    return true;
  }
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const windows = availability[day] ?? [];
  if (start === null || end === null || windows.length === 0) {
    return false;
  }
  return windows.some((window) => {
    const windowStart = timeToMinutes(window.start);
    const windowEnd = timeToMinutes(window.end);
    return windowStart !== null && windowEnd !== null && start >= windowStart && end <= windowEnd;
  });
}

/** Comprueba si un hueco (instante de inicio) cae dentro de alguna franja del dia. */
export function isSlotAvailable(
  availability: WeeklyAvailability | undefined,
  day: DayId,
  slot: string,
): boolean {
  if (!availability) {
    return true;
  }
  const slotStart = timeToMinutes(slot);
  const windows = availability[day] ?? [];
  if (slotStart === null) {
    return false;
  }
  return windows.some((window) => {
    const windowStart = timeToMinutes(window.start);
    const windowEnd = timeToMinutes(window.end);
    return windowStart !== null && windowEnd !== null && slotStart >= windowStart && slotStart < windowEnd;
  });
}

export function isSlotInsideVisibleHours(day: DayId, slot: string, config: WeekConfig): boolean {
  const slotStart = timeToMinutes(slot);
  const visible = getDayVisibleRange(config, day);
  const visibleStart = timeToMinutes(visible.start);
  const visibleEnd = timeToMinutes(visible.end);
  if (slotStart === null || visibleStart === null || visibleEnd === null) {
    return false;
  }
  return slotStart >= visibleStart && slotStart < visibleEnd;
}
