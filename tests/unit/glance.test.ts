/**
 * The At-a-glance tiles' live values (lib/glance.ts): the current role's length, degree
 * progress, Akshat's clock and how Akshat's working hours overlap a visitor's day.
 */
import { describe, expect, it } from "vitest";
import {
  clockHands,
  degreeProgress,
  formatClock,
  hoursLabel,
  monthsLabel,
  monthsSince,
  prefersHour12,
  wallMinutes,
  workingOverlap,
  zoneOffset,
} from "@/lib/glance";

/** Noon in Jaipur on 16 Nov 2026. */
const NOW = new Date("2026-11-16T06:30:00Z");
const AKSHAT = { start: "10:00", end: "18:00", timeZone: "Asia/Kolkata" };
const day = (timeZone: string) => ({ start: "09:00", end: "17:00", timeZone });

describe("durations", () => {
  it("counts the current role in calendar months, its first month included", () => {
    expect(monthsSince("2026-06", "Asia/Kolkata", NOW)).toBe(6);
    expect(monthsSince("2026-11", "Asia/Kolkata", NOW)).toBe(1);
  });

  it("names a length the way people say it", () => {
    expect(monthsLabel(1)).toBe("1 month");
    expect(monthsLabel(6)).toBe("6 months");
    expect(monthsLabel(12)).toBe("1 year");
    expect(monthsLabel(14)).toBe("1 year 2 months");
  });
});

describe("degree progress", () => {
  it("measures from the start month to the graduation month, rounding down", () => {
    const progress = degreeProgress("2023-07", "2027-07", "Asia/Kolkata", NOW);
    // 1,234 of 1,461 days.
    expect(progress.percent).toBe(84);
    expect(progress.daysToGraduationMonth).toBe(227);
    expect(progress.monthsRemaining).toBe(8);
    expect(progress.graduated).toBe(false);
  });

  it("stops at both ends", () => {
    expect(degreeProgress("2023-07", "2027-07", "Asia/Kolkata", new Date("2022-01-01T00:00:00Z")).progress).toBe(0);
    const done = degreeProgress("2023-07", "2027-07", "Asia/Kolkata", new Date("2027-07-01T00:00:00Z"));
    expect(done).toMatchObject({ progress: 1, percent: 100, daysToGraduationMonth: 0, graduated: true });
  });
});

describe("clocks", () => {
  it("reads the wall clock and the offset in any time zone, past ±12 hours too", () => {
    expect(wallMinutes("Asia/Kolkata", NOW)).toBe(12 * 60);
    expect(zoneOffset("Asia/Kolkata", NOW)).toBe(330);
    expect(zoneOffset("Europe/London", NOW)).toBe(0);
    expect(zoneOffset("America/New_York", NOW)).toBe(-300);
    expect(zoneOffset("Pacific/Auckland", NOW)).toBe(780);
  });

  it("writes 12- and 24-hour time", () => {
    expect(formatClock(21 * 60 + 41, true, "en-US")).toBe("9:41 PM");
    expect(formatClock(21 * 60 + 41, false, "en-US")).toBe("21:41");
    expect(formatClock(1440 + 30, false, "en-US")).toBe("00:30");
    expect(prefersHour12("en-US")).toBe(true);
    expect(prefersHour12("de-DE")).toBe(false);
  });

  it("sets the hands of a clock face", () => {
    expect(clockHands(9 * 60 + 41)).toEqual({ hour: 290.5, minute: 246 });
    expect(clockHands(0)).toEqual({ hour: 0, minute: 0 });
  });
});

describe("the overlap with a visitor's 9 to 5", () => {
  it("is most of the day for a visitor in India", () => {
    expect(workingOverlap(AKSHAT, day("Asia/Kolkata"), NOW)).toEqual({ minutes: 420, theirs: [600, 1080], yours: [540, 1020], shared: [600, 1020] });
  });

  it("is the morning in London and the afternoon in Tokyo", () => {
    expect(workingOverlap(AKSHAT, day("Europe/London"), NOW)).toMatchObject({ minutes: 210, theirs: [270, 750], shared: [540, 750] });
    expect(workingOverlap(AKSHAT, day("Asia/Tokyo"), NOW)).toMatchObject({ minutes: 210, theirs: [810, 1290], shared: [810, 1020] });
  });

  it("is nothing in New York or Auckland, whose days miss Akshat's", () => {
    expect(workingOverlap(AKSHAT, day("America/New_York"), NOW)).toMatchObject({ minutes: 0, shared: null, theirs: [1410, 1890] });
    expect(workingOverlap(AKSHAT, day("Pacific/Auckland"), NOW).minutes).toBe(0);
  });

  it("names the overlap in hours and minutes", () => {
    expect(hoursLabel(210)).toBe("3 h 30 min");
    expect(hoursLabel(420)).toBe("7 h");
    expect(hoursLabel(45)).toBe("45 min");
  });
});
