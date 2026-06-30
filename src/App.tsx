import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { ResourceEditorModal, ResourceKind } from "./components/ResourceEditorModal";
import { ResourcePanel } from "./components/ResourcePanel";
import { SessionEditorModal } from "./components/SessionEditorModal";
import { TopBar } from "./components/TopBar";
import { PlannerGrid } from "./components/PlannerGrid";
import { PrintView } from "./components/PrintView";
import { WeekBar } from "./components/WeekBar";
import { createSampleData } from "./data/sampleData";
import { matchesFilters } from "./lib/filtering";
import { makeId } from "./lib/ids";
import { ensureWeeks, loadStoredData, normalizeImportedData, saveStoredData } from "./lib/storage";
import { generateSchedule, GenerationResult } from "./lib/generator";
import { addWeeksISO, mondayOfISO, todayISO } from "./lib/dates";
import { addMinutes, durationMinutes } from "./lib/time";
import { applyDerivedSessionStatuses, summarizeReport, validateSessions } from "./lib/validation";
import { issueMessage, LanguageContext, translate } from "./lib/i18n";
import { AppData, Coach, Filters, Language, Team, TrainingSession, Venue } from "./types";

type ResourceModalState = {
  kind: ResourceKind;
  id?: string;
} | null;

type ToastState = { key?: string; text?: string; undo?: boolean } | null;

type HistoryState = { past: AppData[]; present: AppData };

const HISTORY_LIMIT = 60;

const initialFilters: Filters = {
  teamId: "all",
  coachId: "all",
  venueId: "all",
  day: "all",
};

function resolveResource(data: AppData, modal: ResourceModalState) {
  if (!modal?.id) return undefined;
  if (modal.kind === "team") return data.teams.find((team) => team.id === modal.id);
  if (modal.kind === "coach") return data.coaches.find((coach) => coach.id === modal.id);
  return data.venues.find((venue) => venue.id === modal.id);
}

export function App() {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: applyDerivedSessionStatuses(loadStoredData()),
  }));
  const data = history.present;
  const canUndo = history.past.length > 0;
  const lang = data.config.language;
  const t = (key: string) => translate(lang, key);
  const currentWeekStart = data.config.currentWeekStart ?? mondayOfISO(todayISO());
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [resourceModal, setResourceModal] = useState<ResourceModalState>(null);
  const [saveLabel, setSaveLabel] = useState("save.local");
  const [toast, setToast] = useState<ToastState>(null);
  const [generation, setGeneration] = useState<GenerationResult | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const weekSessions = useMemo(
    () => data.sessions.filter((session) => (session.weekStart ?? "") === currentWeekStart),
    [data.sessions, currentWeekStart],
  );
  const report = useMemo(
    () => validateSessions(weekSessions, data.config, data.venues, data.coaches, data.teams),
    [data.config, weekSessions, data.venues, data.coaches, data.teams],
  );
  const issueSummary = useMemo(() => summarizeReport(report), [report]);
  const filteredSessions = useMemo(
    () => weekSessions.filter((session) => matchesFilters(session, filters)),
    [weekSessions, filters],
  );

  useEffect(() => {
    saveStoredData(data);
    setSaveLabel("save.now");
    const timeout = window.setTimeout(() => setSaveLabel("save.local"), 1200);
    return () => window.clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.undo ? 5200 : 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateData = (updater: AppData | ((current: AppData) => AppData)) => {
    setHistory((current) => {
      const next = applyDerivedSessionStatuses(
        typeof updater === "function" ? updater(current.present) : updater,
      );
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
      };
    });
  };

  const handleUndo = () => {
    setHistory((current) => {
      if (current.past.length === 0) return current;
      return {
        past: current.past.slice(0, -1),
        present: current.past[current.past.length - 1],
      };
    });
    setToast({ key: "toast.undone" });
  };

  const handleToggleLanguage = () => {
    const nextLanguage: Language = lang === "es" ? "eu" : "es";
    setHistory((current) => ({
      ...current,
      present: { ...current.present, config: { ...current.present.config, language: nextLanguage } },
    }));
  };

  // Navegar de semana es estado de vista: actualiza la config sin tocar el historial de deshacer.
  const goToWeek = (weekStart: string) => {
    setHistory((current) => ({
      ...current,
      present: { ...current.present, config: { ...current.present.config, currentWeekStart: weekStart } },
    }));
    setGeneration(null);
  };
  const handlePrevWeek = () => goToWeek(addWeeksISO(currentWeekStart, -1));
  const handleNextWeek = () => goToWeek(addWeeksISO(currentWeekStart, 1));
  const handleToday = () => goToWeek(mondayOfISO(todayISO()));

  const handleSaveSession = (incoming: TrainingSession) => {
    // Una sesion nueva pertenece a la semana que se esta viendo.
    const session: TrainingSession = { ...incoming, weekStart: incoming.weekStart ?? currentWeekStart };
    updateData((current) => {
      const exists = current.sessions.some((entry) => entry.id === session.id);
      return {
        ...current,
        sessions: exists
          ? current.sessions.map((entry) => (entry.id === session.id ? session : entry))
          : [...current.sessions, session],
      };
    });
    setCreatingSession(false);
    setEditingSessionId(null);
    setToast({ key: "toast.sessionSaved" });
  };

  const handleResizeSession = (sessionId: string, newEndTime: string) => {
    updateData((current) => ({
      ...current,
      sessions: current.sessions.map((session) => {
        if (session.id !== sessionId || !session.startTime) return session;
        return { ...session, endTime: newEndTime, durationMinutes: durationMinutes(session.startTime, newEndTime) };
      }),
    }));
  };

  const handleDeleteSession = (sessionId: string) => {
    updateData((current) => ({
      ...current,
      sessions: current.sessions.filter((session) => session.id !== sessionId),
    }));
    setCreatingSession(false);
    setEditingSessionId(null);
    setToast({ key: "toast.sessionDeleted", undo: true });
  };

  const handleSaveResource = (kind: ResourceKind, resource: Team | Coach | Venue) => {
    updateData((current) => {
      if (kind === "team") {
        const exists = current.teams.some((team) => team.id === resource.id);
        return {
          ...current,
          teams: exists
            ? current.teams.map((team) => (team.id === resource.id ? (resource as Team) : team))
            : [...current.teams, resource as Team],
        };
      }
      if (kind === "coach") {
        const exists = current.coaches.some((coach) => coach.id === resource.id);
        return {
          ...current,
          coaches: exists
            ? current.coaches.map((coach) => (coach.id === resource.id ? (resource as Coach) : coach))
            : [...current.coaches, resource as Coach],
        };
      }
      const exists = current.venues.some((venue) => venue.id === resource.id);
      return {
        ...current,
        venues: exists
          ? current.venues.map((venue) => (venue.id === resource.id ? (resource as Venue) : venue))
          : [...current.venues, resource as Venue],
      };
    });
    setResourceModal(null);
    setToast({ key: "toast.resourceSaved" });
  };

  const handleDeleteResource = (kind: ResourceKind, id: string) => {
    updateData((current) => {
      if (kind === "team") {
        return {
          ...current,
          teams: current.teams.map((team) => (team.id === id ? { ...team, active: false } : team)),
        };
      }

      if (kind === "coach") {
        return {
          ...current,
          coaches: current.coaches.map((coach) => (coach.id === id ? { ...coach, active: false } : coach)),
          sessions: current.sessions.map((session) => (session.coachId === id ? { ...session, coachId: null } : session)),
        };
      }

      return {
        ...current,
        venues: current.venues.map((venue) => (venue.id === id ? { ...venue, active: false } : venue)),
        sessions: current.sessions.map((session) =>
          session.venueId === id
            ? {
                ...session,
                venueId: null,
                day: null,
                startTime: null,
                endTime: null,
                status: "pendiente",
                durationMinutes: durationMinutes(session.startTime, session.endTime),
              }
            : session,
        ),
      };
    });
    setToast({
      key: kind === "venue" ? "toast.venueDisabled" : "toast.resourceDisabled",
      undo: true,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!activeId.startsWith("session|") || !overId.startsWith("slot|")) {
      return;
    }

    const sessionId = activeId.split("|")[1];
    const [, day, venueId, startTime] = overId.split("|");
    updateData((current) => ({
      ...current,
      sessions: current.sessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }
        const length = session.startTime && session.endTime ? durationMinutes(session.startTime, session.endTime) : session.durationMinutes ?? 60;
        return {
          ...session,
          day: day as TrainingSession["day"],
          venueId,
          startTime,
          endTime: addMinutes(startTime, length),
          durationMinutes: length,
          status: "colocada",
        };
      }),
    }));
    setToast({ key: "toast.sessionPlaced", undo: true });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "iraurgi-ordu-planificacion.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!window.confirm(t("confirm.import"))) {
        return;
      }
      updateData(normalizeImportedData(parsed));
      setToast({ key: "toast.imported", undo: true });
    } catch {
      setToast({ key: "toast.importError" });
    }
  };

  const handleReset = () => {
    if (!window.confirm(t("confirm.reset"))) {
      return;
    }
    const sample = ensureWeeks(createSampleData());
    // Mantener el idioma elegido aunque se restauren los datos de prueba.
    updateData((current) => ({ ...sample, config: { ...sample.config, language: current.config.language } }));
    setFilters(initialFilters);
    setToast({ key: "toast.sampleRestored", undo: true });
  };

  // Copia las sesiones de la semana actual a la semana siguiente y navega a ella.
  const handleDuplicateWeek = () => {
    const target = addWeeksISO(currentWeekStart, 1);
    const copies = data.sessions
      .filter((session) => (session.weekStart ?? "") === currentWeekStart)
      .map((session) => ({ ...session, id: makeId("session"), weekStart: target }));
    if (copies.length === 0) {
      setToast({ key: "toast.weekEmpty" });
      return;
    }
    updateData((current) => ({ ...current, sessions: [...current.sessions, ...copies] }));
    goToWeek(target);
    setToast({ key: "toast.weekDuplicated", undo: true });
  };

  const handleGenerate = () => {
    const result = generateSchedule(data, currentWeekStart);
    if (result.created === 0 && result.unplaced.length === 0) {
      setGeneration(null);
      setToast({ key: "gen.nothing" });
      return;
    }
    if (result.created > 0) {
      updateData((current) => ({ ...current, sessions: [...current.sessions, ...result.sessions] }));
    }
    setGeneration(result.unplaced.length > 0 ? result : null);
    const remaining = result.unplaced.reduce((sum, item) => sum + item.remaining, 0);
    const parts = [`${result.created} ${t("gen.created")}`];
    if (remaining > 0) parts.push(`${remaining} ${t("gen.unplaced")}`);
    setToast({ text: parts.join(" · "), undo: result.created > 0 });
  };

  const editingSession = editingSessionId ? data.sessions.find((session) => session.id === editingSessionId) : undefined;
  const editingResource = resolveResource(data, resourceModal);

  return (
    <LanguageContext.Provider value={lang}>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="app-shell">
        <ResourcePanel
          data={data}
          sessions={weekSessions}
          report={report}
          onEditResource={(kind, id) => setResourceModal({ kind, id })}
          onDeleteResource={handleDeleteResource}
          onEditSession={(sessionId) => setEditingSessionId(sessionId)}
          onCreateSession={() => setCreatingSession(true)}
        />

        <div className="workspace">
          <TopBar
            data={data}
            filters={filters}
            issueSummary={issueSummary}
            saveLabel={saveLabel}
            canUndo={canUndo}
            language={lang}
            onUndo={handleUndo}
            onToggleLanguage={handleToggleLanguage}
            onFiltersChange={setFilters}
            onNewSession={() => setCreatingSession(true)}
            onGenerate={handleGenerate}
            onPrint={handlePrint}
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
            onDuplicateWeek={handleDuplicateWeek}
          />

          <WeekBar
            weekStart={currentWeekStart}
            language={lang}
            onPrev={handlePrevWeek}
            onNext={handleNextWeek}
            onToday={handleToday}
          />

          {generation && generation.unplaced.length > 0 && (
            <div className="issue-strip gen-strip" aria-live="polite">
              <strong>{t("gen.unplacedTitle")}</strong>
              {generation.unplaced.map((item) => (
                <span key={item.teamId} className="issue-chip issue-chip--warning">
                  {data.teams.find((team) => team.id === item.teamId)?.name ?? item.teamId}: {item.remaining}
                </span>
              ))}
              <button type="button" className="small-button" onClick={() => setGeneration(null)}>
                {t("gen.dismiss")}
              </button>
            </div>
          )}

          {report.issues.length > 0 && (
            <div className="issue-strip" aria-live="polite">
              {report.issues.slice(0, 4).map((issue) => (
                <span key={issue.id} className={`issue-chip issue-chip--${issue.severity}`}>
                  {issueMessage(lang, issue.type, issue.severity)}
                </span>
              ))}
              {report.issues.length > 4 && (
                <span className="issue-chip">
                  +{report.issues.length - 4} {t("common.more")}
                </span>
              )}
            </div>
          )}

          <PlannerGrid
            data={data}
            sessions={filteredSessions}
            filters={filters}
            report={report}
            weekStart={currentWeekStart}
            onEditSession={(sessionId) => setEditingSessionId(sessionId)}
            onResizeSession={handleResizeSession}
          />

          <PrintView data={data} sessions={filteredSessions} filters={filters} weekStart={currentWeekStart} />
        </div>

        {(creatingSession || editingSession) && (
          <SessionEditorModal
            data={data}
            session={editingSession}
            onSave={handleSaveSession}
            onDelete={handleDeleteSession}
            onClose={() => {
              setCreatingSession(false);
              setEditingSessionId(null);
            }}
          />
        )}

        {resourceModal && (
          <ResourceEditorModal
            kind={resourceModal.kind}
            resource={editingResource}
            venues={data.venues}
            onSave={handleSaveResource}
            onClose={() => setResourceModal(null)}
          />
        )}

        {toast && (
          <div className="toast" role="status">
            <span>{toast.text ?? (toast.key ? t(toast.key) : "")}</span>
            {toast.undo && canUndo && (
              <button type="button" className="toast__action" onClick={handleUndo}>
                {t("btn.undo")}
              </button>
            )}
          </div>
        )}
      </div>
    </DndContext>
    </LanguageContext.Provider>
  );
}
