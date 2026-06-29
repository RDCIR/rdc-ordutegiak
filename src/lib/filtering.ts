import { Filters, TrainingSession } from "../types";

export function matchesFilters(session: TrainingSession, filters: Filters): boolean {
  if (filters.teamId !== "all" && session.teamId !== filters.teamId) {
    return false;
  }
  if (filters.coachId !== "all" && session.coachId !== filters.coachId) {
    return false;
  }
  if (filters.venueId !== "all" && session.venueId !== filters.venueId) {
    return false;
  }
  if (filters.day !== "all" && session.day !== filters.day) {
    return false;
  }
  return true;
}
