import { describe, expect, it } from "vitest";
import { addWeeksISO, dateForDay, mondayOfISO } from "./dates";

describe("dates", () => {
  it("finds the Monday of a week", () => {
    // 2026-01-07 es miercoles; su lunes es 2026-01-05.
    expect(mondayOfISO("2026-01-07")).toBe("2026-01-05");
    expect(mondayOfISO("2026-01-05")).toBe("2026-01-05");
    expect(mondayOfISO("2026-01-11")).toBe("2026-01-05"); // domingo
  });

  it("adds and subtracts whole weeks", () => {
    expect(addWeeksISO("2026-01-05", 1)).toBe("2026-01-12");
    expect(addWeeksISO("2026-01-05", -1)).toBe("2025-12-29");
  });

  it("resolves the date of a weekday inside a week", () => {
    expect(dateForDay("2026-01-05", "monday")).toBe("2026-01-05");
    expect(dateForDay("2026-01-05", "wednesday")).toBe("2026-01-07");
    expect(dateForDay("2026-01-05", "sunday")).toBe("2026-01-11");
  });
});
