import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Clock, GripVertical, Lock } from "lucide-react";
import { CSSProperties, KeyboardEvent } from "react";
import { Coach, Team, TrainingSession, ValidationIssue, Venue } from "../types";
import { issueMessage, sessionTypeLabel, useLanguage, useT } from "../lib/i18n";

interface SessionCardProps {
  session: TrainingSession;
  team?: Team;
  coach?: Coach;
  venue?: Venue;
  issues?: ValidationIssue[];
  variant?: "pending" | "scheduled";
  style?: CSSProperties;
  onEdit: (sessionId: string) => void;
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
}: SessionCardProps) {
  const t = useT();
  const lang = useLanguage();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `session|${session.id}`,
    data: { sessionId: session.id },
  });

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
      style={{ ...style, ...transformStyle, borderLeftColor: color }}
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
    </div>
  );
}
