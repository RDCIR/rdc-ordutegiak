import { describe, expect, it } from "vitest";
import { createSampleData } from "../data/sampleData";
import { TrainingSession, ValidationType } from "../types";
import { validateSessions } from "./validation";

function issueTypes(sessions: TrainingSession[]): ValidationType[] {
  const data = createSampleData();
  return validateSessions(sessions, data.config).issues.map((issue) => issue.type);
}

describe("validateSessions", () => {
  it("detects venue overlap", () => {
    const data = createSampleData();
    const conflict: TrainingSession = {
      ...data.sessions[1],
      id: "venue-conflict",
      venueId: "venue-pista-1",
      day: "monday",
      startTime: "16:30",
      endTime: "17:30",
      status: "colocada",
    };

    expect(issueTypes([data.sessions[0], conflict])).toContain("venue-overlap");
  });

  it("detects coach overlap across different venues", () => {
    const data = createSampleData();
    const conflict: TrainingSession = {
      ...data.sessions[1],
      id: "coach-conflict",
      coachId: "coach-ane",
      day: "monday",
      startTime: "16:30",
      endTime: "17:00",
      status: "colocada",
    };

    expect(issueTypes([data.sessions[0], conflict])).toContain("coach-overlap");
  });

  it("detects team overlap across different venues", () => {
    const data = createSampleData();
    const conflict: TrainingSession = {
      ...data.sessions[1],
      id: "team-conflict",
      teamId: "team-infantil-a",
      day: "monday",
      startTime: "16:30",
      endTime: "17:00",
      status: "colocada",
    };

    expect(issueTypes([data.sessions[0], conflict])).toContain("team-overlap");
  });

  it("marks a missing coach as a warning, not an error", () => {
    const data = createSampleData();
    const report = validateSessions([data.sessions[4]], data.config);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "missing-coach",
          severity: "warning",
        }),
      ]),
    );
    expect(report.issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("detects invalid time ranges and sessions outside visible hours", () => {
    const data = createSampleData();
    const invalid = { ...data.sessions[0], id: "invalid-time", startTime: "18:00", endTime: "18:00" };
    const outside = { ...data.sessions[0], id: "outside", startTime: "12:00", endTime: "13:00" };
    const report = validateSessions([invalid, outside], data.config);

    expect(report.issues.map((issue) => issue.type)).toEqual(
      expect.arrayContaining(["invalid-time", "outside-visible-hours"]),
    );
  });

  it("flags a session as an error when its venue is closed at that time", () => {
    const data = createSampleData();
    // El gimnasio abre L-V; sabado esta cerrado.
    const session: TrainingSession = {
      ...data.sessions[0],
      id: "venue-closed-test",
      venueId: "venue-gimnasio",
      coachId: null,
      day: "saturday",
      startTime: "10:00",
      endTime: "11:00",
      status: "colocada",
    };
    const report = validateSessions([session], data.config, data.venues, data.coaches);
    const issue = report.issues.find((entry) => entry.type === "venue-closed");

    expect(issue?.severity).toBe("error");
  });

  it("warns (not error) when a coach is placed outside their availability", () => {
    const data = createSampleData();
    // Maialen solo esta disponible M-J; el lunes esta fuera de su disponibilidad.
    const session: TrainingSession = {
      ...data.sessions[0],
      id: "coach-unavailable-test",
      coachId: "coach-maialen",
      venueId: "venue-pista-1",
      day: "monday",
      startTime: "16:00",
      endTime: "17:00",
      status: "colocada",
    };
    const report = validateSessions([session], data.config, data.venues, data.coaches);
    const issue = report.issues.find((entry) => entry.type === "coach-unavailable");

    expect(issue?.severity).toBe("warning");
    expect(report.issues.some((entry) => entry.type === "venue-closed")).toBe(false);
  });
});
