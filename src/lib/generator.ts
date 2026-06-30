import { AppData, DayId, DAYS, TrainingSession, Venue } from "../types";
import { makeId } from "./ids";
import { getDayVisibleRange, minutesToTime, timeToMinutes } from "./time";

export interface UnplacedDemand {
  teamId: string;
  /** Cuantas sesiones de ese equipo no se pudieron colocar. */
  remaining: number;
}

export interface GenerationResult {
  /** Sesiones nuevas colocadas por el generador. */
  sessions: TrainingSession[];
  /** Equipos a los que les falto hueco. */
  unplaced: UnplacedDemand[];
  /** Total de sesiones creadas. */
  created: number;
}

interface Occupied {
  teamId: string | null;
  venueId: string;
  day: DayId;
  start: number;
  end: number;
}

interface Demand {
  teamId: string;
  duration: number;
  allowedDays: DayId[];
  preferredVenueId: string | null;
}

/**
 * Genera las sesiones que faltan para que cada equipo (con necesidades
 * definidas) alcance su numero de sesiones por semana. Heuristica greedy:
 *
 * - Solo coloca el deficit (sesiones objetivo menos las ya colocadas), asi
 *   es idempotente: volver a generar no duplica.
 * - Reglas DURAS: pista abierta a esa hora, sin choque de pista ni de equipo,
 *   dentro del horario visible del dia, y solo en dias permitidos del equipo.
 * - Preferencias BLANDAS (puntuacion): pista preferida del equipo, repartir
 *   las sesiones entre dias distintos y equilibrar la carga por dia.
 * - No modifica las sesiones existentes (las fijas y las demas son obstaculos).
 */
export function generateSchedule(data: AppData, weekStart: string): GenerationResult {
  const { config } = data;
  const block = config.blockMinutes;
  const visibleDays = DAYS.filter((day) => config.daysVisible.includes(day.id)).map((day) => day.id);
  const activeVenues = data.venues.filter((venue) => venue.active);

  // Solo cuentan como ocupacion las sesiones de la semana en la que generamos.
  const occupied: Occupied[] = [];
  for (const session of data.sessions) {
    if ((session.weekStart ?? "") !== weekStart) continue;
    if (session.day && session.venueId && session.startTime && session.endTime) {
      const start = timeToMinutes(session.startTime);
      const end = timeToMinutes(session.endTime);
      if (start !== null && end !== null) {
        occupied.push({ teamId: session.teamId, venueId: session.venueId, day: session.day, start, end });
      }
    }
  }

  const demands: Demand[] = [];
  for (const team of data.teams) {
    if (!team.active || !team.needs) continue;
    const current = occupied.filter((entry) => entry.teamId === team.id).length;
    const deficit = Math.max(0, team.needs.sessionsPerWeek - current);
    const allowedDays = visibleDays.filter((day) => !team.needs!.forbiddenDays.includes(day));
    for (let index = 0; index < deficit; index += 1) {
      demands.push({
        teamId: team.id,
        duration: team.needs.sessionDurationMinutes,
        allowedDays,
        preferredVenueId: team.needs.preferredVenueId ?? null,
      });
    }
  }

  // Mas restringidos primero: menos dias disponibles y, a igualdad, mas largos.
  demands.sort((a, b) => a.allowedDays.length - b.allowedDays.length || b.duration - a.duration);

  const windowsFor = (venue: Venue, day: DayId): Array<[number, number]> => {
    const visible = getDayVisibleRange(config, day);
    const visStart = timeToMinutes(visible.start) ?? 0;
    const visEnd = timeToMinutes(visible.end) ?? 0;
    const raw: Array<[number, number]> = venue.openHours
      ? (venue.openHours[day] ?? []).map((window) => [
          timeToMinutes(window.start) ?? 0,
          timeToMinutes(window.end) ?? 0,
        ])
      : [[visStart, visEnd]];
    return raw
      .map(([start, end]) => [Math.max(start, visStart), Math.min(end, visEnd)] as [number, number])
      .filter(([start, end]) => end > start);
  };

  const hasConflict = (teamId: string, venueId: string, day: DayId, start: number, end: number) =>
    occupied.some(
      (entry) =>
        entry.day === day &&
        start < entry.end &&
        entry.start < end &&
        (entry.venueId === venueId || entry.teamId === teamId),
    );

  const sessions: TrainingSession[] = [];
  const unplacedByTeam = new Map<string, number>();

  for (const demand of demands) {
    let best: { venueId: string; day: DayId; start: number; score: number } | null = null;

    for (const day of demand.allowedDays) {
      for (const venue of activeVenues) {
        for (const [windowStart, windowEnd] of windowsFor(venue, day)) {
          for (let start = windowStart; start + demand.duration <= windowEnd; start += block) {
            const end = start + demand.duration;
            if (hasConflict(demand.teamId, venue.id, day, start, end)) continue;

            let score = 0;
            if (demand.preferredVenueId && venue.id === demand.preferredVenueId) score += 100;
            if (occupied.some((entry) => entry.teamId === demand.teamId && entry.day === day)) score -= 60;
            score -= occupied.filter((entry) => entry.day === day).length * 3;
            score -= start * 0.001; // a igualdad, antes mejor

            if (!best || score > best.score) {
              best = { venueId: venue.id, day, start, score };
            }
          }
        }
      }
    }

    if (best) {
      const end = best.start + demand.duration;
      occupied.push({ teamId: demand.teamId, venueId: best.venueId, day: best.day, start: best.start, end });
      sessions.push({
        id: makeId("session"),
        teamId: demand.teamId,
        coachId: null,
        venueId: best.venueId,
        day: best.day,
        startTime: minutesToTime(best.start),
        endTime: minutesToTime(end),
        durationMinutes: demand.duration,
        type: "entrenamiento",
        notes: "",
        status: "colocada",
        weekStart,
      });
    } else {
      unplacedByTeam.set(demand.teamId, (unplacedByTeam.get(demand.teamId) ?? 0) + 1);
    }
  }

  const unplaced = [...unplacedByTeam.entries()].map(([teamId, remaining]) => ({ teamId, remaining }));
  return { sessions, unplaced, created: sessions.length };
}
