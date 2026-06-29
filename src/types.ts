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

export interface Team {
  id: string;
  name: string;
  category: string;
  color: string;
  notes: string;
  active: boolean;
}

export interface Coach {
  id: string;
  name: string;
  availability?: string;
  color?: string;
  notes: string;
  active: boolean;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  capacity?: number;
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
  | "outside-visible-hours";

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
