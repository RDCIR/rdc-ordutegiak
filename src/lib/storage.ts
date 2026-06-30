import { createSampleData } from "../data/sampleData";
import { mondayOfISO, todayISO } from "./dates";
import {
  AppData,
  Coach,
  DAYS,
  DayId,
  SessionStatus,
  SessionType,
  Team,
  TeamNeeds,
  TimeRange,
  TrainingSession,
  Venue,
  WeeklyAvailability,
} from "../types";

export const STORAGE_KEY = "iraurgi-ordu-planner-v1";
export const BACKUP_KEY = "iraurgi-ordu-backups-v1";
const MAX_BACKUPS = 7;

function hasArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const sessionTypes: SessionType[] = [
  "entrenamiento",
  "partido",
  "fisico",
  "tecnificacion",
  "reunion",
  "otro",
];
const sessionStatuses: SessionStatus[] = ["pendiente", "colocada", "conflicto"];
const dayIds = DAYS.map((day) => day.id);
const timeRe = /^\d{2}:\d{2}$/;

function sanitizeTimeRange(value: unknown): TimeRange | null {
  if (!isRecord(value)) return null;
  const { start, end } = value;
  if (typeof start !== "string" || typeof end !== "string") return null;
  if (!timeRe.test(start) || !timeRe.test(end)) return null;
  return { start, end };
}

/** Sanea un horario semanal. Devuelve undefined si el campo no estaba (= sin limite). */
function sanitizeAvailability(value: unknown): WeeklyAvailability | undefined {
  if (!isRecord(value)) return undefined;
  const result: WeeklyAvailability = {};
  for (const day of dayIds) {
    const ranges = value[day];
    if (Array.isArray(ranges)) {
      const clean = ranges.map(sanitizeTimeRange).filter((range): range is TimeRange => range !== null);
      if (clean.length > 0) result[day] = clean;
    }
  }
  return result;
}

function sanitizeNeeds(value: unknown): TeamNeeds | undefined {
  if (!isRecord(value)) return undefined;
  const forbiddenDays = Array.isArray(value.forbiddenDays)
    ? value.forbiddenDays.filter((day): day is DayId => typeof day === "string" && dayIds.includes(day as DayId))
    : [];
  return {
    sessionsPerWeek: typeof value.sessionsPerWeek === "number" ? value.sessionsPerWeek : 2,
    sessionDurationMinutes: typeof value.sessionDurationMinutes === "number" ? value.sessionDurationMinutes : 90,
    forbiddenDays,
    preferredVenueId: typeof value.preferredVenueId === "string" ? value.preferredVenueId : null,
  };
}

function sanitizeTeam(value: unknown): Team | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    name: asString(value.name, "Equipo sin nombre"),
    category: asString(value.category),
    color: asString(value.color, "#64748b"),
    notes: asString(value.notes),
    active: asBoolean(value.active),
    needs: sanitizeNeeds(value.needs),
  };
}

function sanitizeCoach(value: unknown): Coach | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    name: asString(value.name, "Entrenador sin nombre"),
    availability: asOptionalString(value.availability),
    availabilityWindows: sanitizeAvailability(value.availabilityWindows),
    color: asOptionalString(value.color),
    notes: asString(value.notes),
    active: asBoolean(value.active),
  };
}

function sanitizeVenue(value: unknown): Venue | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    name: asString(value.name, "Pista sin nombre"),
    type: asString(value.type, "Pista"),
    capacity: typeof value.capacity === "number" ? value.capacity : undefined,
    openHours: sanitizeAvailability(value.openHours),
    notes: asString(value.notes),
    active: asBoolean(value.active),
  };
}

function sanitizeSession(value: unknown): TrainingSession | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const type = sessionTypes.includes(value.type as SessionType)
    ? (value.type as SessionType)
    : "entrenamiento";
  const status = sessionStatuses.includes(value.status as SessionStatus)
    ? (value.status as SessionStatus)
    : "pendiente";
  const day = dayIds.includes(value.day as DayId) ? (value.day as DayId) : null;
  return {
    id: value.id,
    teamId: asNullableString(value.teamId),
    coachId: asNullableString(value.coachId),
    venueId: asNullableString(value.venueId),
    day,
    startTime: asNullableString(value.startTime),
    endTime: asNullableString(value.endTime),
    durationMinutes: typeof value.durationMinutes === "number" ? value.durationMinutes : 60,
    type,
    notes: asString(value.notes),
    status,
    color: asOptionalString(value.color),
    locked: value.locked === true || undefined,
    weekStart: asOptionalString(value.weekStart),
  };
}

/**
 * Garantiza fechas reales: fija la semana actual en la config (si falta) y
 * asigna esa semana a las sesiones que aun no tienen una (datos antiguos).
 */
export function ensureWeeks(data: AppData): AppData {
  const currentWeekStart = data.config.currentWeekStart ?? mondayOfISO(todayISO());
  return {
    ...data,
    config: { ...data.config, currentWeekStart },
    sessions: data.sessions.map((session) =>
      session.weekStart ? session : { ...session, weekStart: currentWeekStart },
    ),
  };
}

function sanitizeList<T>(value: unknown, sanitize: (entry: unknown) => T | null, fallback: T[]): T[] {
  if (!hasArray(value)) return fallback;
  const result = value.map(sanitize).filter((entry): entry is T => entry !== null);
  return result;
}

export function normalizeImportedData(value: unknown): AppData {
  const fallback = createSampleData();
  if (!isRecord(value)) {
    return ensureWeeks(fallback);
  }

  return ensureWeeks({
    schemaVersion: 1,
    config: { ...fallback.config, ...(isRecord(value.config) ? value.config : {}) },
    teams: sanitizeList(value.teams, sanitizeTeam, fallback.teams),
    coaches: sanitizeList(value.coaches, sanitizeCoach, fallback.coaches),
    venues: sanitizeList(value.venues, sanitizeVenue, fallback.venues),
    sessions: sanitizeList(value.sessions, sanitizeSession, fallback.sessions),
  });
}

export function loadStoredData(): AppData {
  if (typeof localStorage === "undefined") {
    return ensureWeeks(createSampleData());
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return ensureWeeks(createSampleData());
  }

  try {
    return normalizeImportedData(JSON.parse(stored));
  } catch {
    return ensureWeeks(createSampleData());
  }
}

export interface BackupEntry {
  date: string;
  data: AppData;
}

function readBackups(): Record<string, AppData> {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AppData>) : {};
  } catch {
    return {};
  }
}

/** Guarda una copia diaria (una por dia natural) y conserva las ultimas MAX_BACKUPS. */
function writeDailyBackup(data: AppData) {
  if (typeof localStorage === "undefined") return;
  try {
    const backups = readBackups();
    const today = new Date().toISOString().slice(0, 10);
    backups[today] = data;
    const dates = Object.keys(backups).sort();
    while (dates.length > MAX_BACKUPS) {
      const oldest = dates.shift();
      if (oldest) delete backups[oldest];
    }
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
  } catch {
    // Si el almacenamiento esta lleno, la copia diaria no debe bloquear el guardado principal.
  }
}

export function listBackups(): BackupEntry[] {
  return Object.entries(readBackups())
    .map(([date, data]) => ({ date, data }))
    .sort((first, second) => second.date.localeCompare(first.date));
}

export function saveStoredData(data: AppData) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // El almacenamiento local puede estar lleno o bloqueado; se ignora para no romper la app.
  }
  writeDailyBackup(data);
}
