import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Coach, DAYS, DayId, Team, TeamNeeds, Venue } from "../types";
import { makeId } from "../lib/ids";
import { dayShort, useLanguage, useT } from "../lib/i18n";
import { AvailabilityEditor } from "./AvailabilityEditor";

export type ResourceKind = "team" | "coach" | "venue";
type ResourceValue = Team | Coach | Venue;

interface ResourceEditorModalProps {
  kind: ResourceKind;
  resource?: ResourceValue;
  venues: Venue[];
  onSave: (kind: ResourceKind, resource: ResourceValue) => void;
  onClose: () => void;
}

const defaultNeeds: TeamNeeds = {
  sessionsPerWeek: 2,
  sessionDurationMinutes: 90,
  forbiddenDays: [],
  preferredVenueId: null,
};

function createEmptyResource(kind: ResourceKind): ResourceValue {
  if (kind === "team") {
    return {
      id: makeId("team"),
      name: "",
      category: "",
      color: "#2f80ed",
      notes: "",
      active: true,
    };
  }
  if (kind === "coach") {
    return {
      id: makeId("coach"),
      name: "",
      availability: "",
      color: "#0f766e",
      notes: "",
      active: true,
    };
  }
  return {
    id: makeId("venue"),
    name: "",
    type: "",
    capacity: undefined,
    notes: "",
    active: true,
  };
}

function titleKey(kind: ResourceKind, editing: boolean): string {
  const action = editing ? "edit" : "new";
  const noun = kind === "team" ? "Team" : kind === "coach" ? "Coach" : "Venue";
  return `resource.${action}${noun}`;
}

export function ResourceEditorModal({ kind, resource, venues, onSave, onClose }: ResourceEditorModalProps) {
  const t = useT();
  const lang = useLanguage();
  const [draft, setDraft] = useState<ResourceValue>(() => resource ?? createEmptyResource(kind));

  useEffect(() => {
    setDraft(resource ?? createEmptyResource(kind));
  }, [kind, resource]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave(kind, draft);
  };

  const patchDraft = (patch: Partial<ResourceValue>) => {
    setDraft((current) => ({ ...current, ...patch }) as ResourceValue);
  };

  const isTeam = kind === "team";
  const isCoach = kind === "coach";
  const isVenue = kind === "venue";

  const teamNeeds = (draft as Team).needs;
  const setNeeds = (needs: TeamNeeds | undefined) => patchDraft({ needs } as Partial<ResourceValue>);
  const patchNeeds = (patch: Partial<TeamNeeds>) => setNeeds({ ...(teamNeeds ?? defaultNeeds), ...patch });
  const toggleForbiddenDay = (day: DayId) => {
    const current = teamNeeds ?? defaultNeeds;
    const forbiddenDays = current.forbiddenDays.includes(day)
      ? current.forbiddenDays.filter((entry) => entry !== day)
      : [...current.forbiddenDays, day];
    patchNeeds({ forbiddenDays });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal modal--narrow" role="dialog" aria-modal="true" aria-labelledby="resource-editor-title">
        <div className="modal__header">
          <h2 id="resource-editor-title">{t(titleKey(kind, Boolean(resource)))}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("aria.close")}>
            <X size={18} />
          </button>
        </div>

        <form className="form-grid form-grid--single" onSubmit={handleSubmit}>
          <label>
            {t("field.name")}
            <input value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} required />
          </label>

          {isTeam && (
            <>
              <label>
                {t("field.category")}
                <input value={(draft as Team).category} onChange={(event) => patchDraft({ category: event.target.value } as Partial<ResourceValue>)} />
              </label>
              <label>
                {t("field.color")}
                <input type="color" value={(draft as Team).color} onChange={(event) => patchDraft({ color: event.target.value } as Partial<ResourceValue>)} />
              </label>

              <div className="avail-editor">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(teamNeeds)}
                    onChange={(event) => setNeeds(event.target.checked ? { ...defaultNeeds } : undefined)}
                  />
                  {t("needs.enable")}
                </label>

                {!teamNeeds ? (
                  <p className="avail-editor__hint">{t("needs.disabledHint")}</p>
                ) : (
                  <div className="needs-grid">
                    <label>
                      {t("needs.sessionsPerWeek")}
                      <input
                        type="number"
                        min={0}
                        max={14}
                        value={teamNeeds.sessionsPerWeek}
                        onChange={(event) => patchNeeds({ sessionsPerWeek: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      {t("needs.duration")}
                      <input
                        type="number"
                        min={30}
                        step={15}
                        value={teamNeeds.sessionDurationMinutes}
                        onChange={(event) => patchNeeds({ sessionDurationMinutes: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      {t("needs.preferredVenue")}
                      <select
                        value={teamNeeds.preferredVenueId ?? ""}
                        onChange={(event) => patchNeeds({ preferredVenueId: event.target.value || null })}
                      >
                        <option value="">{t("needs.noPreference")}</option>
                        {venues
                          .filter((venue) => venue.active || venue.id === teamNeeds.preferredVenueId)
                          .map((venue) => (
                            <option key={venue.id} value={venue.id}>
                              {venue.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="needs-days">
                      <span className="needs-days__label">{t("needs.forbiddenDays")}</span>
                      <div className="needs-days__chips">
                        {DAYS.map((day) => {
                          const on = teamNeeds.forbiddenDays.includes(day.id);
                          return (
                            <button
                              type="button"
                              key={day.id}
                              className={`day-chip${on ? " day-chip--on" : ""}`}
                              aria-pressed={on}
                              onClick={() => toggleForbiddenDay(day.id)}
                            >
                              {dayShort(lang, day.id)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {isCoach && (
            <>
              <label>
                {t("field.availability")}
                <input
                  value={(draft as Coach).availability ?? ""}
                  onChange={(event) => patchDraft({ availability: event.target.value } as Partial<ResourceValue>)}
                />
              </label>
              <label>
                {t("field.color")}
                <input
                  type="color"
                  value={(draft as Coach).color ?? "#0f766e"}
                  onChange={(event) => patchDraft({ color: event.target.value } as Partial<ResourceValue>)}
                />
              </label>
              <AvailabilityEditor
                value={(draft as Coach).availabilityWindows}
                onChange={(availabilityWindows) => patchDraft({ availabilityWindows } as Partial<ResourceValue>)}
                limitLabel={t("avail.limitCoach")}
                noLimitHint={t("avail.noLimitCoach")}
                defaultRange={{ start: "16:00", end: "21:00" }}
              />
            </>
          )}

          {isVenue && (
            <>
              <label>
                {t("field.type")}
                <input value={(draft as Venue).type} onChange={(event) => patchDraft({ type: event.target.value } as Partial<ResourceValue>)} />
              </label>
              <label>
                {t("field.capacity")}
                <input
                  type="number"
                  min={0}
                  value={(draft as Venue).capacity ?? ""}
                  onChange={(event) =>
                    patchDraft({ capacity: event.target.value ? Number(event.target.value) : undefined } as Partial<ResourceValue>)
                  }
                />
              </label>
              <AvailabilityEditor
                value={(draft as Venue).openHours}
                onChange={(openHours) => patchDraft({ openHours } as Partial<ResourceValue>)}
                limitLabel={t("avail.limitVenue")}
                noLimitHint={t("avail.noLimitVenue")}
                defaultRange={{ start: "16:00", end: "22:00" }}
              />
            </>
          )}

          <label>
            {t("field.notes")}
            <textarea value={draft.notes} onChange={(event) => patchDraft({ notes: event.target.value })} rows={3} />
          </label>

          <label className="check-row">
            <input type="checkbox" checked={draft.active} onChange={(event) => patchDraft({ active: event.target.checked })} />
            {t("field.active")}
          </label>

          <div className="modal__actions">
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
