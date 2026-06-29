import { Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppData, DayId, SessionType, TrainingSession } from "../types";
import { DAYS } from "../types";
import { makeId } from "../lib/ids";
import { addMinutes, buildTimeSlots, durationMinutes } from "../lib/time";
import { dayLabel, sessionTypeLabel, useLanguage, useT } from "../lib/i18n";

interface SessionEditorModalProps {
  data: AppData;
  session?: TrainingSession;
  onSave: (session: TrainingSession) => void;
  onDelete: (sessionId: string) => void;
  onClose: () => void;
}

const sessionTypes: SessionType[] = ["entrenamiento", "partido", "fisico", "tecnificacion", "reunion", "otro"];

function createEmptySession(): TrainingSession {
  return {
    id: makeId("session"),
    teamId: null,
    coachId: null,
    venueId: null,
    day: null,
    startTime: null,
    endTime: null,
    durationMinutes: 60,
    type: "entrenamiento",
    notes: "",
    status: "pendiente",
  };
}

export function SessionEditorModal({ data, session, onSave, onDelete, onClose }: SessionEditorModalProps) {
  const t = useT();
  const lang = useLanguage();
  const [draft, setDraft] = useState<TrainingSession>(() => session ?? createEmptySession());
  const timeOptions = useMemo(() => buildTimeSlots("09:00", "22:30", data.config.blockMinutes), [data.config.blockMinutes]);

  useEffect(() => {
    setDraft(session ?? createEmptySession());
  }, [session]);

  const updateDraft = (patch: Partial<TrainingSession>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleStartChange = (startTime: string) => {
    const nextEnd = draft.endTime && draft.endTime > startTime ? draft.endTime : addMinutes(startTime, draft.durationMinutes ?? 60);
    updateDraft({ startTime, endTime: nextEnd });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const isPlaced = Boolean(draft.day && draft.venueId && draft.startTime && draft.endTime);
    const nextDuration = isPlaced ? durationMinutes(draft.startTime, draft.endTime) : draft.durationMinutes ?? 60;
    onSave({
      ...draft,
      teamId: draft.teamId || null,
      coachId: draft.coachId || null,
      venueId: draft.venueId || null,
      day: draft.day || null,
      startTime: draft.startTime || null,
      endTime: draft.endTime || null,
      durationMinutes: nextDuration,
      status: isPlaced ? "colocada" : "pendiente",
      color: draft.color || undefined,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="session-editor-title">
        <div className="modal__header">
          <h2 id="session-editor-title">{session ? t("modal.editSession") : t("modal.newSession")}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("aria.close")}>
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t("field.team")}
            <select value={draft.teamId ?? ""} onChange={(event) => updateDraft({ teamId: event.target.value || null })}>
              <option value="">{t("opt.noTeam")}</option>
              {data.teams
                .filter((team) => team.active || team.id === draft.teamId)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            {t("field.coach")}
            <select value={draft.coachId ?? ""} onChange={(event) => updateDraft({ coachId: event.target.value || null })}>
              <option value="">{t("opt.pending")}</option>
              {data.coaches
                .filter((coach) => coach.active || coach.id === draft.coachId)
                .map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            {t("field.venue")}
            <select value={draft.venueId ?? ""} onChange={(event) => updateDraft({ venueId: event.target.value || null })}>
              <option value="">{t("opt.pending")}</option>
              {data.venues
                .filter((venue) => venue.active || venue.id === draft.venueId)
                .map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            {t("field.day")}
            <select value={draft.day ?? ""} onChange={(event) => updateDraft({ day: (event.target.value || null) as DayId | null })}>
              <option value="">{t("opt.pending")}</option>
              {DAYS.map((day) => (
                <option key={day.id} value={day.id}>
                  {dayLabel(lang, day.id)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("field.start")}
            <select value={draft.startTime ?? ""} onChange={(event) => handleStartChange(event.target.value)}>
              <option value="">{t("opt.pending")}</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("field.end")}
            <select value={draft.endTime ?? ""} onChange={(event) => updateDraft({ endTime: event.target.value || null })}>
              <option value="">{t("opt.pending")}</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("field.durationPending")}
            <input
              type="number"
              min={30}
              step={30}
              value={draft.durationMinutes ?? 60}
              onChange={(event) => updateDraft({ durationMinutes: Number(event.target.value) })}
            />
          </label>

          <label>
            {t("field.type")}
            <select value={draft.type} onChange={(event) => updateDraft({ type: event.target.value as SessionType })}>
              {sessionTypes.map((type) => (
                <option key={type} value={type}>
                  {sessionTypeLabel(lang, type)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("field.customColor")}
            <input type="color" value={draft.color || "#64748b"} onChange={(event) => updateDraft({ color: event.target.value })} />
          </label>

          <label className="form-grid__full">
            {t("field.notes")}
            <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} rows={3} />
          </label>

          <label className="check-row form-grid__full">
            <input
              type="checkbox"
              checked={Boolean(draft.locked)}
              onChange={(event) => updateDraft({ locked: event.target.checked })}
            />
            {t("field.locked")}
          </label>

          <div className="modal__actions form-grid__full">
            {session && (
              <button className="danger-button" type="button" onClick={() => onDelete(session.id)}>
                <Trash2 size={15} />
                {t("btn.delete")}
              </button>
            )}
            <span className="modal__spacer" />
            <button className="secondary-button" type="button" onClick={onClose}>
              {t("btn.cancel")}
            </button>
            <button className="primary-button" type="submit">
              {t("btn.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
