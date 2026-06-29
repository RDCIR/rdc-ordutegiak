export const DAYS = [
  { id: "monday", label: "Lunes", short: "Lun", kind: "weekday" },
  { id: "tuesday", label: "Martes", short: "Mar", kind: "weekday" },
  { id: "wednesday", label: "Miercoles", short: "Mie", kind: "weekday" },
  { id: "thursday", label: "Jueves", short: "Jue", kind: "weekday" },
  { id: "friday", label: "Viernes", short: "Vie", kind: "weekday" },
  { id: "saturday", label: "Sabado", short: "Sab", kind: "weekend" },
  { id: "sunday", label: "Domingo", short: "Dom", kind: "weekend" },
] as const;

export type DayId = (typeof DAYS)[number]["id"];

export type SessionType =
  | "entrenamiento"
  | "partido"
  | "fisico"
  | "tecnificacion"
  | "reunion"
  | "otro";

export type SessionStatus = "pendiente" | "colocada" | "conflicto";

export type ColorCriterion = "team" | "coach" | "venue" | "category";

export type Language = "es" | "eu";

/** Una franja horaria "HH:MM"-"HH:MM". */
export interface TimeRange {
  start: string;
  end: string;
}

/** Franjas disponibles por dia de la semana. Un dia ausente = no disponible ese dia. */
export type WeeklyAvailability = Partial<Record<DayId, TimeRange[]>>;

/** Necesidades de un equipo para el generador de horarios. */
export interface TeamNeeds {
  /** Cuantas sesiones hay que colocar por semana. */
  sessionsPerWeek: number;
  /** Duracion de cada sesion en minutos. */
  sessionDurationMinutes: number;
  /** Dias en los que el equipo NO puede entrenar. */
  forbiddenDays: DayId[];
  /** Pista preferida (preferencia blanda); null = sin preferencia. */
  preferredVenueId?: string | null;
}

export interface Team {
  id: string;
  name: string;
  category: string;
  color: string;
  notes: string;
  active: boolean;
  /** Necesidades para el generador. Sin definir = no entra en la generacion. */
  needs?: TeamNeeds;
}

export interface Coach {
  id: string;
  name: string;
  availability?: string;
  /** Franjas en que el entrenador esta disponible. Sin definir = disponible siempre. */
  availabilityWindows?: WeeklyAvailability;
  color?: string;
  notes: string;
  active: boolean;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  /** Horario-marco: franjas en que la pista esta abierta. Sin definir = abierta siempre. */
  openHours?: WeeklyAvailability;
  notes: string;
  active: boolean;
}

export interface TrainingSession {
  id: string;
  teamId: string | null;
  coachId?: string | null;
  venueId?: string | null;
  day?: DayId | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number;
  type: SessionType;
  notes: string;
  status: SessionStatus;
  color?: string;
  /** Sesion fija: el generador no la mueve ni la elimina. */
  locked?: boolean;
}

export interface WeekConfig {
  daysVisible: DayId[];
  weekdayStart: string;
  weekdayEnd: string;
  weekendStart: string;
  weekendEnd: string;
  blockMinutes: number;
  language: Language;
  colorCriterion: ColorCriterion;
  theme: "light" | "dark";
}

export interface AppData {
  schemaVersion: 1;
  teams: Team[];
  coaches: Coach[];
  venues: Venue[];
  sessions: TrainingSession[];
  config: WeekConfig;
}

export interface Filters {
  teamId: string;
  coachId: string;
  venueId: string;
  day: string;
}

export type ValidationSeverity = "error" | "warning";

export type ValidationType =
  | "venue-overlap"
  | "coach-overlap"
  | "team-overlap"
  | "missing-venue"
  | "missing-team"
  | "missing-coach"
  | "missing-time"
  | "invalid-time"
  | "outside-visible-hours"
  | "venue-closed"
  | "coach-unavailable"
  | "team-forbidden-day";

export interface ValidationIssue {
  id: string;
  type: ValidationType;
  severity: ValidationSeverity;
  message: string;
  sessionIds: string[];
}

export interface ValidationReport {
  issues: ValidationIssue[];
  bySessionId: Record<string, ValidationIssue[]>;
}
