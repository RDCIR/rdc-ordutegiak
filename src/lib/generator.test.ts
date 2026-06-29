import { describe, expect, it } from "vitest";
import { AppData, Team, Venue, WeekConfig } from "../types";
import { generateSchedule } from "./generator";
import { timeToMinutes } from "./time";

const config: WeekConfig = {
  daysVisible: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  weekdayStart: "16:00",
  weekdayEnd: "22:00",
  weekendStart: "09:00",
  weekendEnd: "14:00",
  blockMinutes: 30,
  language: "eu",
  colorCriterion: "team",
  theme: "light",
};

function makeData(teams: Team[], venues: Venue[], sessions: AppData["sessions"] = []): AppData {
  return { schemaVersion: 1, config, teams, coaches: [], venues, sessions };
}

const team = (id: string, needs: Team["needs"]): Team => ({
  id,
  name: id,
  category: "",
  color: "#000",
  notes: "",
  active: true,
  needs,
});

const venue = (id: string, openHours?: Venue["openHours"]): Venue => ({
  id,
  name: id,
  type: "",
  notes: "",
  active: true,
  openHours,
});

function noOverlapPerVenue(sessions: AppData["sessions"]): boolean {
  for (let i = 0; i < sessions.length; i += 1) {
    for (let j = i + 1; j < sessions.length; j += 1) {
      const a = sessions[i];
      const b = sessions[j];
      if (a.venueId !== b.venueId || a.day !== b.day) continue;
      const aStart = timeToMinutes(a.startTime!)!;
      const aEnd = timeToMinutes(a.endTime!)!;
      const bStart = timeToMinutes(b.startTime!)!;
      const bEnd = timeToMinutes(b.endTime!)!;
      if (aStart < bEnd && bStart < aEnd) return false;
    }
  }
  return true;
}

describe("generateSchedule", () => {
  it("places the deficit of sessions for a team without overlaps", () => {
    const data = makeData(
      [team("t", { sessionsPerWeek: 2, sessionDurationMinutes: 60, forbiddenDays: [], preferredVenueId: null })],
      [venue("v")],
    );
    const result = generateSchedule(data);

    expect(result.created).toBe(2);
    expect(result.unplaced).toHaveLength(0);
    expect(noOverlapPerVenue(result.sessions)).toBe(true);
  });

  it("respects forbidden days (only places on allowed days)", () => {
    const data = makeData(
      [
        team("t", {
          sessionsPerWeek: 3,
          sessionDurationMinutes: 60,
          forbiddenDays: ["tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
          preferredVenueId: null,
        }),
      ],
      [venue("v")],
    );
    const result = generateSchedule(data);

    expect(result.created).toBe(3);
    expect(result.sessions.every((session) => session.day === "monday")).toBe(true);
    expect(noOverlapPerVenue(result.sessions)).toBe(true);
  });

  it("respects the venue open hours and reports what does not fit", () => {
    const data = makeData(
      [team("t", { sessionsPerWeek: 1, sessionDurationMinutes: 120, forbiddenDays: [], preferredVenueId: null })],
      // La pista solo abre 60 min: no cabe una sesion de 120.
      [venue("v", { monday: [{ start: "16:00", end: "17:00" }] })],
    );
    const result = generateSchedule(data);

    expect(result.created).toBe(0);
    expect(result.unplaced).toEqual([{ teamId: "t", remaining: 1 }]);
  });

  it("prefers the team's preferred venue when possible", () => {
    const data = makeData(
      [team("t", { sessionsPerWeek: 1, sessionDurationMinutes: 60, forbiddenDays: [], preferredVenueId: "v2" })],
      [venue("v1"), venue("v2")],
    );
    const result = generateSchedule(data);

    expect(result.created).toBe(1);
    expect(result.sessions[0].venueId).toBe("v2");
  });
});
