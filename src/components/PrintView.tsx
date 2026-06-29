import { AppData, DAYS, DayId, Filters, Language, TrainingSession } from "../types";
import { timeToMinutes } from "../lib/time";
import { dayLabel, sessionTypeLabel, useLanguage, useT } from "../lib/i18n";

interface PrintViewProps {
  data: AppData;
  sessions: TrainingSession[];
  filters: Filters;
}

function isPlaced(session: TrainingSession): boolean {
  return Boolean(session.day && session.startTime && session.endTime);
}

function byStartTime(first: TrainingSession, second: TrainingSession): number {
  return (timeToMinutes(first.startTime) ?? 0) - (timeToMinutes(second.startTime) ?? 0);
}

/** Describe los filtros activos para titular la hoja impresa (p. ej. "Equipo: Infantil A"). */
function describeFilters(
  data: AppData,
  filters: Filters,
  lang: Language,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  if (filters.teamId !== "all") {
    parts.push(`${t("field.team")}: ${data.teams.find((team) => team.id === filters.teamId)?.name ?? filters.teamId}`);
  }
  if (filters.coachId !== "all") {
    parts.push(`${t("field.coach")}: ${data.coaches.find((coach) => coach.id === filters.coachId)?.name ?? filters.coachId}`);
  }
  if (filters.venueId !== "all") {
    parts.push(`${t("field.venue")}: ${data.venues.find((venue) => venue.id === filters.venueId)?.name ?? filters.venueId}`);
  }
  if (filters.day !== "all") {
    const dayMatch = DAYS.find((day) => day.id === filters.day);
    parts.push(`${t("field.day")}: ${dayMatch ? dayLabel(lang, dayMatch.id as DayId) : filters.day}`);
  }
  return parts.length > 0 ? parts.join(" · ") : t("print.fullSchedule");
}

export function PrintView({ data, sessions, filters }: PrintViewProps) {
  const t = useT();
  const lang = useLanguage();
  const teamName = (id?: string | null) => data.teams.find((team) => team.id === id)?.name ?? t("opt.noTeam");
  const coachName = (id?: string | null) => data.coaches.find((coach) => coach.id === id)?.name ?? t("coach.pending");
  const venueName = (id?: string | null) => data.venues.find((venue) => venue.id === id)?.name ?? t("field.venue");

  const placed = sessions.filter(isPlaced);
  const pending = sessions.filter((session) => !isPlaced(session));
  const visibleDays = DAYS.filter((day) => data.config.daysVisible.includes(day.id));
  const generatedAt = new Date().toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="print-view" aria-hidden="true">
      <header className="print-view__header">
        <div>
          <h1>{t("print.title")}</h1>
          <p>{t("print.subtitle")}</p>
        </div>
        <div className="print-view__meta">
          <strong>{describeFilters(data, filters, lang, t)}</strong>
          <span>
            {t("print.generatedOn")} {generatedAt}
          </span>
        </div>
      </header>

      {visibleDays.map((day) => {
        const daySessions = placed.filter((session) => session.day === day.id).sort(byStartTime);
        if (daySessions.length === 0) return null;
        return (
          <div key={day.id} className="print-day">
            <h2>{dayLabel(lang, day.id)}</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>{t("print.colTime")}</th>
                  <th>{t("print.colTeam")}</th>
                  <th>{t("print.colCoach")}</th>
                  <th>{t("print.colVenue")}</th>
                  <th>{t("print.colType")}</th>
                  <th>{t("print.colNotes")}</th>
                </tr>
              </thead>
              <tbody>
                {daySessions.map((session) => (
                  <tr key={session.id}>
                    <td className="print-table__time">
                      {session.startTime}–{session.endTime}
                    </td>
                    <td>{teamName(session.teamId)}</td>
                    <td>{coachName(session.coachId)}</td>
                    <td>{venueName(session.venueId)}</td>
                    <td>{sessionTypeLabel(lang, session.type)}</td>
                    <td>{session.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {pending.length > 0 && (
        <div className="print-day print-day--pending">
          <h2>{t("print.unassigned")}</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>{t("print.colTeam")}</th>
                <th>{t("print.colCoach")}</th>
                <th>{t("print.colType")}</th>
                <th>{t("print.colNotes")}</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((session) => (
                <tr key={session.id}>
                  <td>{teamName(session.teamId)}</td>
                  <td>{coachName(session.coachId)}</td>
                  <td>{sessionTypeLabel(lang, session.type)}</td>
                  <td>{session.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {placed.length === 0 && pending.length === 0 && (
        <p className="print-empty">{t("print.empty")}</p>
      )}
    </section>
  );
}
