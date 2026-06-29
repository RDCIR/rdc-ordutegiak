import {
  AppData,
  Coach,
  Team,
  TrainingSession,
  ValidationIssue,
  ValidationReport,
  ValidationSeverity,
  ValidationType,
  Venue,
  WeekConfig,
} from "../types";
import { fitsInAvailability, isSessionInsideVisibleHours, rangesOverlap, timeToMinutes } from "./time";

function addIssue(
  issues: ValidationIssue[],
  type: ValidationType,
  severity: ValidationSeverity,
  message: string,
  sessionIds: string[],
) {
  issues.push({
    id: `${type}-${sessionIds.join("-")}`,
    type,
    severity,
    message,
    sessionIds,
  });
}

function hasPlacedTime(session: TrainingSession): session is TrainingSession & {
  day: NonNullable<TrainingSession["day"]>;
  startTime: string;
  endTime: string;
} {
  return Boolean(session.day && session.startTime && session.endTime);
}

export function validateSessions(
  sessions: TrainingSession[],
  config: WeekConfig,
  venues: Venue[] = [],
  coaches: Coach[] = [],
  teams: Team[] = [],
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));
  const coachById = new Map(coaches.map((coach) => [coach.id, coach]));
  const teamById = new Map(teams.map((team) => [team.id, team]));

  for (const session of sessions) {
    const isPending = session.status === "pendiente";

    if (!session.teamId) {
      addIssue(issues, "missing-team", "error", "Sesion sin equipo", [session.id]);
    }

    if (!session.coachId) {
      addIssue(issues, "missing-coach", "warning", "Entrenador pendiente", [session.id]);
    }

    if (!session.venueId) {
      addIssue(
        issues,
        "missing-venue",
        isPending ? "warning" : "error",
        isPending ? "Sesion pendiente sin pista" : "Sesion sin pista",
        [session.id],
      );
    }

    if (!session.day || !session.startTime || !session.endTime) {
      addIssue(
        issues,
        "missing-time",
        isPending ? "warning" : "error",
        isPending ? "Sesion pendiente sin hora" : "Sesion sin dia, inicio o fin",
        [session.id],
      );
      continue;
    }

    const start = timeToMinutes(session.startTime);
    const end = timeToMinutes(session.endTime);
    if (start === null || end === null || end <= start) {
      addIssue(issues, "invalid-time", "error", "Hora fin anterior o igual a la hora inicio", [session.id]);
      continue;
    }

    if (!isSessionInsideVisibleHours(session.day, session.startTime, session.endTime, config)) {
      addIssue(issues, "outside-visible-hours", "error", "Sesion fuera del horario visible", [session.id]);
    }

    const venue = session.venueId ? venueById.get(session.venueId) : undefined;
    if (
      venue?.openHours &&
      !fitsInAvailability(venue.openHours, session.day, session.startTime, session.endTime)
    ) {
      addIssue(issues, "venue-closed", "error", "Pista cerrada a esa hora", [session.id]);
    }

    const coach = session.coachId ? coachById.get(session.coachId) : undefined;
    if (
      coach?.availabilityWindows &&
      !fitsInAvailability(coach.availabilityWindows, session.day, session.startTime, session.endTime)
    ) {
      addIssue(issues, "coach-unavailable", "warning", "Entrenador fuera de su disponibilidad", [session.id]);
    }

    const team = session.teamId ? teamById.get(session.teamId) : undefined;
    if (team?.needs?.forbiddenDays?.includes(session.day)) {
      addIssue(issues, "team-forbidden-day", "warning", "El equipo no entrena ese dia", [session.id]);
    }
  }

  const placedSessions = sessions.filter(hasPlacedTime).filter((session) => session.status !== "pendiente");

  for (let firstIndex = 0; firstIndex < placedSessions.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < placedSessions.length; secondIndex += 1) {
      const first = placedSessions[firstIndex];
      const second = placedSessions[secondIndex];
      if (first.day !== second.day || !rangesOverlap(first.startTime, first.endTime, second.startTime, second.endTime)) {
        continue;
      }

      if (first.venueId && second.venueId && first.venueId === second.venueId) {
        addIssue(issues, "venue-overlap", "error", "Conflicto de pista", [first.id, second.id]);
      }

      if (first.coachId && second.coachId && first.coachId === second.coachId) {
        addIssue(issues, "coach-overlap", "error", "Conflicto de entrenador", [first.id, second.id]);
      }

      if (first.teamId && second.teamId && first.teamId === second.teamId) {
        addIssue(issues, "team-overlap", "error", "Conflicto de equipo", [first.id, second.id]);
      }
    }
  }

  const bySessionId: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    for (const sessionId of issue.sessionIds) {
      bySessionId[sessionId] = [...(bySessionId[sessionId] ?? []), issue];
    }
  }

  return { issues, bySessionId };
}

export function sessionHasError(report: ValidationReport, sessionId: string): boolean {
  return Boolean(report.bySessionId[sessionId]?.some((issue) => issue.severity === "error"));
}

export function sessionHasWarning(report: ValidationReport, sessionId: string): boolean {
  return Boolean(report.bySessionId[sessionId]?.some((issue) => issue.severity === "warning"));
}

export function summarizeReport(report: ValidationReport) {
  return {
    errors: report.issues.filter((issue) => issue.severity === "error").length,
    warnings: report.issues.filter((issue) => issue.severity === "warning").length,
  };
}

export function applyDerivedSessionStatuses(data: AppData): AppData {
  const report = validateSessions(data.sessions, data.config, data.venues, data.coaches, data.teams);
  return {
    ...data,
    sessions: data.sessions.map((session) => {
      if (!session.day || !session.startTime || !session.endTime || !session.venueId) {
        return { ...session, status: "pendiente" };
      }
      if (sessionHasError(report, session.id)) {
        return { ...session, status: "conflicto" };
      }
      return { ...session, status: "colocada" };
    }),
  };
}
