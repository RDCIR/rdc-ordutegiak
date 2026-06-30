import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Clock, GripVertical, Lock } from "lucide-react";
import { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { Coach, Team, TrainingSession, ValidationIssue, Venue } from "../types";
import { issueMessage, sessionTypeLabel, useLanguage, useT } from "../lib/i18n";
import { addMinutes, durationMinutes } from "../lib/time";

interface SessionCardProps {
  session: TrainingSession;
  team?: Team;
  coach?: Coach;
  venue?: Venue;
  issues?: ValidationIssue[];
  variant?: "pending" | "scheduled";
  style?: CSSProperties;
  onEdit: (sessionId: string) => void;
  /** Redimensionar arrastrando el borde inferior (solo sesiones colocadas). */
  onResize?: (sessionId: string, newEndTime: string) => void;
  /** Minutos por fila de la rejilla (bloque). */
  slotMinutes?: number;
  /** Alto en px de una fila de la rejilla. */
  slotHeight?: number;
  /** Maximo de filas que puede ocupar sin salirse de la rejilla visible. */
  maxRows?: number;
}

function formatSessionTime(session: TrainingSession, minLabel: string): string {
  if (session.startTime && session.endTime) {
    return `${session.startTime}-${session.endTime}`;
  }
  return `${session.durationMinutes ?? 60} ${minLabel}`;
}

export function SessionCard({
  session,
  team,
  coach,
  venue,
  issues = [],
  variant = "scheduled",
  style,
  onEdit,
  onResize,
  slotMinutes = 30,
  slotHeight = 36,
  maxRows,
}: SessionCardProps) {
  const t = useT();
  const lang = useLanguage();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `session|${session.id}`,
    data: { sessionId: session.id },
  });

  const canResize = variant === "scheduled" && Boolean(onResize) && Boolean(session.startTime && session.endTime);
  const baseRows = Math.max(1, Math.ceil(durationMinutes(session.startTime, session.endTime) / slotMinutes));
  const [previewRows, setPreviewRows] = useState<number | null>(null);
  const resizeRef = useRef<{ startY: number; rows: number } | null>(null);

  const handleResizeDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canResize) return;
    event.stopPropagation();
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sin puntero activo (p. ej. eventos sinteticos): el arrastre sigue funcionando.
    }
    resizeRef.current = { startY: event.clientY, rows: baseRows };
    setPreviewRows(baseRows);
  };

  const handleResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state) return;
    event.stopPropagation();
    const deltaRows = Math.round((event.clientY - state.startY) / slotHeight);
    const upper = maxRows ?? Number.MAX_SAFE_INTEGER;
    const rows = Math.max(1, Math.min(baseRows + deltaRows, upper));
    state.rows = rows;
    setPreviewRows(rows);
  };

  const finishResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state) return;
    event.stopPropagation();
    resizeRef.current = null;
    setPreviewRows(null);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignorar si no habia captura
    }
    if (onResize && session.startTime && state.rows !== baseRows) {
      onResize(session.id, addMinutes(session.startTime, state.rows * slotMinutes));
    }
  };

  const hasError = issues.some((issue) => issue.severity === "error");
  const hasWarning = issues.some((issue) => issue.severity === "warning");
  const color = session.color || team?.color || "#64748b";
  const transformStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEdit(session.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={[
        "session-card",
        `session-card--${variant}`,
        hasError ? "session-card--error" : "",
        hasWarning && !hasError ? "session-card--warning" : "",
        isDragging ? "session-card--dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...style,
        ...transformStyle,
        ...(previewRows != null ? { gridRowEnd: `span ${previewRows}` } : null),
        borderLeftColor: color,
      }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onEdit(session.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="session-card__top">
        <span className="session-card__drag" aria-hidden="true">
          <GripVertical size={14} />
        </span>
        <strong>{team?.name ?? t("opt.noTeam")}</strong>
        {session.locked && (
          <span className="session-card__lock" title={t("field.locked")} aria-hidden="true">
            <Lock size={12} />
          </span>
        )}
        {(hasError || hasWarning) && (
          <span
            className="session-card__alert"
            title={issues.map((issue) => issueMessage(lang, issue.type, issue.severity)).join(", ")}
          >
            <AlertTriangle size={14} />
          </span>
        )}
      </div>
      <div className="session-card__meta">
        <span>
          <Clock size={12} />
          {formatSessionTime(session, t("common.min"))}
        </span>
        <span>{coach?.name ?? t("coach.pending")}</span>
      </div>
      {variant === "pending" && venue?.name && <div className="session-card__venue">{venue.name}</div>}
      <div className="session-card__type">{sessionTypeLabel(lang, session.type)}</div>
      {canResize && (
        <div
          className="session-card__resize"
          title={t("session.resize")}
          aria-hidden="true"
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}
