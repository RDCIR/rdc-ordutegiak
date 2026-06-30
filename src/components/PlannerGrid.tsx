import { useDroppable } from "@dnd-kit/core";
import { CalendarDays } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AppData, DayId, Filters, TrainingSession, ValidationReport, Venue } from "../types";
import { DAYS } from "../types";
import {
  buildTimeSlots,
  durationMinutes,
  getGlobalVisibleRange,
  isSlotAvailable,
  isSlotInsideVisibleHours,
  timeToMinutes,
} from "../lib/time";
import { SessionCard } from "./SessionCard";
import { dayLabel, useLanguage, useT } from "../lib/i18n";
import { dateForDay, dayOfMonth } from "../lib/dates";

interface PlannerGridProps {
  data: AppData;
  sessions: TrainingSession[];
  filters: Filters;
  report: ValidationReport;
  weekStart: string;
  onEditSession: (sessionId: string) => void;
}

interface SlotProps {
  day: DayId;
  venue: Venue;
  slot: string;
  active: boolean;
  column: number;
  row: number;
}

function Slot({ day, venue, slot, active, column, row }: SlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot|${day}|${venue.id}|${slot}`,
    data: { day, venueId: venue.id, startTime: slot },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "planner-slot",
        active ? "" : "planner-slot--closed",
        isOver ? "planner-slot--over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ gridColumn: column, gridRow: row }}
      aria-label={`${day} ${venue.name} ${slot}`}
    />
  );
}

interface SessionLayout {
  /** Columna (0..columns-1) que ocupa la sesion dentro de su grupo solapado. */
  level: number;
  /** Numero total de columnas del grupo solapado (para repartir el ancho). */
  columns: number;
}

/**
 * Para cada sesion colocada calcula en que columna va y cuantas columnas
 * comparten su "racimo" de solapes (mismo dia y pista). Asi las tarjetas que
 * coinciden en hora se reparten el ancho en vez de pisarse.
 */
function getSessionLayout(sessions: TrainingSession[]): Record<string, SessionLayout> {
  const result: Record<string, SessionLayout> = {};
  const groups = new Map<string, TrainingSession[]>();

  for (const session of sessions) {
    if (!session.day || !session.venueId || !session.startTime || !session.endTime) {
      continue;
    }
    const key = `${session.day}|${session.venueId}`;
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }

  // Asigna columnas a un racimo de sesiones que se solapan entre si.
  const layoutCluster = (cluster: TrainingSession[]) => {
    const columnEnds: number[] = [];
    const columnOf: Record<string, number> = {};
    for (const session of cluster) {
      const start = timeToMinutes(session.startTime) ?? 0;
      const end = timeToMinutes(session.endTime) ?? start;
      let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
      if (column === -1) {
        column = columnEnds.length;
      }
      columnEnds[column] = end;
      columnOf[session.id] = column;
    }
    const columns = columnEnds.length;
    for (const session of cluster) {
      result[session.id] = { level: columnOf[session.id], columns };
    }
  };

  for (const group of groups.values()) {
    const ordered = [...group].sort(
      (first, second) => (timeToMinutes(first.startTime) ?? 0) - (timeToMinutes(second.startTime) ?? 0),
    );

    let cluster: TrainingSession[] = [];
    let clusterEnd = -1;
    for (const session of ordered) {
      const start = timeToMinutes(session.startTime) ?? 0;
      const end = timeToMinutes(session.endTime) ?? start;
      // Si esta sesion empieza despues de que acabe todo el racimo, el racimo se cierra.
      if (cluster.length > 0 && start >= clusterEnd) {
        layoutCluster(cluster);
        cluster = [];
        clusterEnd = -1;
      }
      cluster.push(session);
      clusterEnd = Math.max(clusterEnd, end);
    }
    layoutCluster(cluster);
  }

  return result;
}

export function PlannerGrid({ data, sessions, filters, report, weekStart, onEditSession }: PlannerGridProps) {
  const t = useT();
  const lang = useLanguage();
  const shellRef = useRef<HTMLElement | null>(null);
  const didAutoScroll = useRef(false);
  const visibleDays = DAYS.filter((day) => data.config.daysVisible.includes(day.id)).filter(
    (day) => filters.day === "all" || filters.day === day.id,
  );
  const visibleVenues = data.venues.filter((venue) => venue.active).filter(
    (venue) => filters.venueId === "all" || filters.venueId === venue.id,
  );
  const range = getGlobalVisibleRange(data.config);
  const slots = buildTimeSlots(range.start, range.end, data.config.blockMinutes);
  const columns = visibleDays.flatMap((day) => visibleVenues.map((venue) => ({ day, venue })));
  const sessionLayout = getSessionLayout(sessions);
  const globalStart = timeToMinutes(range.start) ?? 0;

  const scheduledSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status !== "pendiente" &&
          session.day &&
          session.venueId &&
          session.startTime &&
          session.endTime &&
          visibleDays.some((day) => day.id === session.day) &&
          visibleVenues.some((venue) => venue.id === session.venueId),
      ),
    [sessions, visibleDays, visibleVenues],
  );

  useLayoutEffect(() => {
    if (didAutoScroll.current || !shellRef.current) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (!shellRef.current) {
        return;
      }
      const targetStart = timeToMinutes(data.config.weekdayStart) ?? globalStart;
      const targetSlot = Math.max(0, Math.floor((targetStart - globalStart) / data.config.blockMinutes) - 2);
      shellRef.current.scrollTop = targetSlot * 36;
      didAutoScroll.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (columns.length === 0) {
    return (
      <main className="planner-empty">
        <CalendarDays size={32} />
        <h2>{t("grid.emptyTitle")}</h2>
        <p>{t("grid.emptyBody")}</p>
      </main>
    );
  }

  return (
    <main className="planner-shell" aria-label="Horario semanal" ref={shellRef}>
      <div
        className="planner-grid"
        style={{
          gridTemplateColumns: `74px repeat(${columns.length}, minmax(108px, 1fr))`,
          gridTemplateRows: `42px 32px repeat(${slots.length}, 36px)`,
        }}
      >
        <div className="planner-corner" style={{ gridColumn: 1, gridRow: "1 / span 2" }}>
          {t("grid.hour")}
        </div>

        {visibleDays.map((day, dayIndex) => (
          <div
            key={day.id}
            className="planner-day-header"
            style={{
              gridColumn: `${dayIndex * visibleVenues.length + 2} / span ${visibleVenues.length}`,
              gridRow: 1,
            }}
          >
            {dayLabel(lang, day.id)} <span className="planner-day-header__date">{dayOfMonth(dateForDay(weekStart, day.id))}</span>
          </div>
        ))}

        {columns.map((column, index) => (
          <div
            key={`${column.day.id}-${column.venue.id}`}
            className="planner-venue-header"
            style={{ gridColumn: index + 2, gridRow: 2 }}
          >
            {column.venue.name}
          </div>
        ))}

        {slots.map((slot, slotIndex) => (
          <div key={slot} className="planner-time" style={{ gridColumn: 1, gridRow: slotIndex + 3 }}>
            {slot}
          </div>
        ))}

        {columns.flatMap((column, columnIndex) =>
          slots.map((slot, slotIndex) => (
            <Slot
              key={`${column.day.id}-${column.venue.id}-${slot}`}
              day={column.day.id}
              venue={column.venue}
              slot={slot}
              active={
                isSlotInsideVisibleHours(column.day.id, slot, data.config) &&
                isSlotAvailable(column.venue.openHours, column.day.id, slot)
              }
              column={columnIndex + 2}
              row={slotIndex + 3}
            />
          )),
        )}

        {scheduledSessions.map((session) => {
          const columnIndex = columns.findIndex(
            (column) => column.day.id === session.day && column.venue.id === session.venueId,
          );
          const startMinutes = timeToMinutes(session.startTime) ?? globalStart;
          const slotIndex = Math.max(0, Math.floor((startMinutes - globalStart) / data.config.blockMinutes));
          const rowSpan = Math.max(1, Math.ceil(durationMinutes(session.startTime, session.endTime) / data.config.blockMinutes));
          const team = data.teams.find((entry) => entry.id === session.teamId);
          const coach = data.coaches.find((entry) => entry.id === session.coachId);
          const venue = data.venues.find((entry) => entry.id === session.venueId);
          const cell = sessionLayout[session.id] ?? { level: 0, columns: 1 };
          const split = cell.columns > 1;

          return (
            <SessionCard
              key={session.id}
              session={session}
              team={team}
              coach={coach}
              venue={venue}
              issues={report.bySessionId[session.id] ?? []}
              variant="scheduled"
              onEdit={onEditSession}
              style={{
                gridColumn: columnIndex + 2,
                gridRow: `${slotIndex + 3} / span ${rowSpan}`,
                width: split ? `calc(${100 / cell.columns}% - 6px)` : undefined,
                marginLeft: split ? `calc(${(cell.level * 100) / cell.columns}% + 3px)` : undefined,
                zIndex: 20 + cell.level,
              }}
            />
          );
        })}
      </div>
    </main>
  );
}
