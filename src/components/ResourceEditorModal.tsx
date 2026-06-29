import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Coach, Team, Venue } from "../types";
import { makeId } from "../lib/ids";
import { useT } from "../lib/i18n";
import { AvailabilityEditor } from "./AvailabilityEditor";

export type ResourceKind = "team" | "coach" | "venue";
type ResourceValue = Team | Coach | Venue;

interface ResourceEditorModalProps {
  kind: ResourceKind;
  resource?: ResourceValue;
  onSave: (kind: ResourceKind, resource: ResourceValue) => void;
  onClose: () => void;
}

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

export function ResourceEditorModal({ kind, resource, onSave, onClose }: ResourceEditorModalProps) {
  const t = useT();
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
