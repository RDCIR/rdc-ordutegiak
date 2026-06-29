import { Edit3, MapPin, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { AppData, ValidationReport } from "../types";
import { useT } from "../lib/i18n";
import { SessionCard } from "./SessionCard";

type ResourceKind = "team" | "coach" | "venue";

interface ResourcePanelProps {
  data: AppData;
  report: ValidationReport;
  onEditResource: (kind: ResourceKind, id?: string) => void;
  onDeleteResource: (kind: ResourceKind, id: string) => void;
  onEditSession: (sessionId: string) => void;
  onCreateSession: () => void;
}

function ResourceSection({
  title,
  kind,
  icon,
  children,
  onAdd,
}: {
  title: string;
  kind: ResourceKind;
  icon: ReactNode;
  children: ReactNode;
  onAdd: (kind: ResourceKind) => void;
}) {
  const t = useT();
  return (
    <section className="resource-section">
      <div className="resource-section__header">
        <h2>
          {icon}
          {title}
        </h2>
        <button className="icon-button" type="button" onClick={() => onAdd(kind)} aria-label={`${t("aria.add")} ${title}`}>
          <Plus size={16} />
        </button>
      </div>
      <div className="resource-list">{children}</div>
    </section>
  );
}

export function ResourcePanel({
  data,
  report,
  onEditResource,
  onDeleteResource,
  onEditSession,
  onCreateSession,
}: ResourcePanelProps) {
  const t = useT();
  const pendingSessions = data.sessions.filter(
    (session) => session.status === "pendiente" || !session.day || !session.venueId || !session.startTime || !session.endTime,
  );

  return (
    <aside className="sidebar" aria-label="Recursos y pendientes">
      <div className="sidebar__brand">
        <div>
          <h1>Iraurgi Ordu</h1>
          <p>{t("app.subtitle")}</p>
        </div>
        <button className="primary-icon-button" type="button" onClick={onCreateSession} aria-label={t("aria.newSession")}>
          <Plus size={18} />
        </button>
      </div>

      <section className="resource-section resource-section--pending">
        <div className="resource-section__header">
          <h2>{t("sidebar.pending")}</h2>
          <button className="small-button" type="button" onClick={onCreateSession}>
            <Plus size={14} />
            {t("sidebar.session")}
          </button>
        </div>
        <div className="pending-list">
          {pendingSessions.length === 0 ? (
            <p className="empty-copy">{t("sidebar.noPending")}</p>
          ) : (
            pendingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                team={data.teams.find((team) => team.id === session.teamId)}
                coach={data.coaches.find((coach) => coach.id === session.coachId)}
                venue={data.venues.find((venue) => venue.id === session.venueId)}
                issues={report.bySessionId[session.id] ?? []}
                variant="pending"
                onEdit={onEditSession}
              />
            ))
          )}
        </div>
      </section>

      <ResourceSection title={t("section.teams")} kind="team" icon={<UsersRound size={16} />} onAdd={onEditResource}>
        {data.teams
          .filter((team) => team.active)
          .map((team) => (
            <div className="resource-row" key={team.id}>
              <span className="resource-swatch" style={{ background: team.color }} />
              <div>
                <strong>{team.name}</strong>
                <span>{team.category || t("team.noCategory")}</span>
              </div>
              <button className="icon-button" type="button" onClick={() => onEditResource("team", team.id)} aria-label={t("aria.editTeam")}>
                <Edit3 size={14} />
              </button>
              <button className="icon-button" type="button" onClick={() => onDeleteResource("team", team.id)} aria-label={t("aria.deleteTeam")}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
      </ResourceSection>

      <ResourceSection title={t("section.coaches")} kind="coach" icon={<UserRound size={16} />} onAdd={onEditResource}>
        {data.coaches
          .filter((coach) => coach.active)
          .map((coach) => (
            <div className="resource-row" key={coach.id}>
              <span className="resource-swatch" style={{ background: coach.color || "#78909c" }} />
              <div>
                <strong>{coach.name}</strong>
                <span>{coach.availability || t("coach.freeAvailability")}</span>
              </div>
              <button className="icon-button" type="button" onClick={() => onEditResource("coach", coach.id)} aria-label={t("aria.editCoach")}>
                <Edit3 size={14} />
              </button>
              <button className="icon-button" type="button" onClick={() => onDeleteResource("coach", coach.id)} aria-label={t("aria.deleteCoach")}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
      </ResourceSection>

      <ResourceSection title={t("section.venues")} kind="venue" icon={<MapPin size={16} />} onAdd={onEditResource}>
        {data.venues
          .filter((venue) => venue.active)
          .map((venue) => (
            <div className="resource-row" key={venue.id}>
              <span className="resource-icon">
                <MapPin size={14} />
              </span>
              <div>
                <strong>{venue.name}</strong>
                <span>
                  {venue.type}
                  {venue.capacity ? ` · ${venue.capacity}` : ""}
                </span>
              </div>
              <button className="icon-button" type="button" onClick={() => onEditResource("venue", venue.id)} aria-label={t("aria.editVenue")}>
                <Edit3 size={14} />
              </button>
              <button className="icon-button" type="button" onClick={() => onDeleteResource("venue", venue.id)} aria-label={t("aria.deleteVenue")}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
      </ResourceSection>
    </aside>
  );
}
