import {
  Copy,
  Download,
  Filter,
  Languages,
  Printer,
  RotateCcw,
  Sparkles,
  Undo2,
  Upload,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { ChangeEvent, useRef } from "react";
import { AppData, Filters, Language } from "../types";
import { DAYS } from "../types";
import { dayLabel, useT } from "../lib/i18n";

interface TopBarProps {
  data: AppData;
  filters: Filters;
  issueSummary: { errors: number; warnings: number };
  saveLabel: string;
  canUndo: boolean;
  language: Language;
  onUndo: () => void;
  onToggleLanguage: () => void;
  onFiltersChange: (filters: Filters) => void;
  onNewSession: () => void;
  onGenerate: () => void;
  onPrint: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onDuplicateWeek: () => void;
}

export function TopBar({
  data,
  filters,
  issueSummary,
  saveLabel,
  canUndo,
  language,
  onUndo,
  onToggleLanguage,
  onFiltersChange,
  onNewSession,
  onGenerate,
  onPrint,
  onExport,
  onImport,
  onReset,
  onDuplicateWeek,
}: TopBarProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      event.target.value = "";
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__title">
        <h2>{t("topbar.title")}</h2>
        <span className={issueSummary.errors ? "status-pill status-pill--error" : "status-pill"}>
          {issueSummary.errors || issueSummary.warnings ? (
            <>
              <AlertTriangle size={14} />
              {issueSummary.errors} {t("topbar.conflicts")} · {issueSummary.warnings} {t("topbar.warnings")}
            </>
          ) : (
            t("topbar.noConflicts")
          )}
        </span>
        <span className="save-label">{t(saveLabel)}</span>
      </div>

      <div className="filter-strip" aria-label={t("filter.aria")}>
        <Filter size={16} />
        <select value={filters.teamId} onChange={(event) => onFiltersChange({ ...filters, teamId: event.target.value })}>
          <option value="all">{t("filter.allTeams")}</option>
          {data.teams
            .filter((team) => team.active)
            .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </select>
        <select value={filters.coachId} onChange={(event) => onFiltersChange({ ...filters, coachId: event.target.value })}>
          <option value="all">{t("filter.allCoaches")}</option>
          {data.coaches
            .filter((coach) => coach.active)
            .map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name}
              </option>
            ))}
        </select>
        <select value={filters.venueId} onChange={(event) => onFiltersChange({ ...filters, venueId: event.target.value })}>
          <option value="all">{t("filter.allVenues")}</option>
          {data.venues
            .filter((venue) => venue.active)
            .map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
        </select>
        <select value={filters.day} onChange={(event) => onFiltersChange({ ...filters, day: event.target.value })}>
          <option value="all">{t("filter.allDays")}</option>
          {DAYS.map((day) => (
            <option key={day.id} value={day.id}>
              {dayLabel(language, day.id)}
            </option>
          ))}
        </select>
      </div>

      <div className="action-strip">
        <button type="button" className="toolbar-button toolbar-button--primary" onClick={onNewSession}>
          <Plus size={15} />
          {t("btn.new")}
        </button>
        <button type="button" className="toolbar-button toolbar-button--accent" onClick={onGenerate} title={t("btn.generateTitle")}>
          <Sparkles size={15} />
          {t("btn.generate")}
        </button>
        <button type="button" className="toolbar-button" onClick={onUndo} disabled={!canUndo} title={t("btn.undoTitle")}>
          <Undo2 size={15} />
          {t("btn.undo")}
        </button>
        <button type="button" className="toolbar-button" onClick={onDuplicateWeek}>
          <Copy size={15} />
          {t("btn.duplicateWeek")}
        </button>
        <button type="button" className="toolbar-button" onClick={onPrint} title={t("btn.printTitle")}>
          <Printer size={15} />
          {t("btn.print")}
        </button>
        <button type="button" className="toolbar-button" onClick={onExport}>
          <Download size={15} />
          {t("btn.export")}
        </button>
        <button type="button" className="toolbar-button" onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} />
          {t("btn.import")}
        </button>
        <button type="button" className="toolbar-button" onClick={onReset}>
          <RotateCcw size={15} />
          {t("btn.sample")}
        </button>
        <button type="button" className="toolbar-button" onClick={onToggleLanguage} title={t("lang.toggleTitle")}>
          <Languages size={15} />
          {language === "es" ? "EU" : "ES"}
        </button>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={handleFileChange} />
      </div>
    </header>
  );
}
