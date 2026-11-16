/**
 * "The edit" (DESIGN.md §7.4): its tracks and panels from content (content/derive.ts) and
 * the scroll ↔ playhead mapping (lib/edit.ts), on a pinned today.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { data } from "@/content/data";
import { edit } from "@/content/derive";
import { formatDayRange, formatMonthRange } from "@/lib/dates";
import { activeAt, EDIT, monthsAt, playStep, progressAt, type ScrubClip, scrubMap, shuttle, targetOf, timeAt } from "@/lib/edit";

const TODAY = "2026-11-16";
const result = edit(content);
const track = (id: string) => result.tracks.find((entry) => entry.id === id)!;
const clip = (id: string) => result.tracks.flatMap((entry) => entry.clips).find((entry) => entry.id === id)!;
const panel = (id: string) => result.panels.find((entry) => entry.id === id)!;

const scrubClips: ScrubClip[] = result.tracks.flatMap((entry) =>
  entry.clips.map((item) => ({ id: item.id, track: entry.id, lane: item.lane, from: monthsAt(item.start), to: monthsAt(item.end ?? TODAY) })),
);
const map = scrubMap(scrubClips, monthsAt(result.start), monthsAt(TODAY));
const scrub = (id: string) => scrubClips.find((entry) => entry.id === id)!;

describe("dates as a résumé writes them", () => {
  it("writes month spans", () => {
    expect(formatMonthRange("2025-07", "2025-08")).toBe("Jul–Aug 2025");
    expect(formatMonthRange("2025-12", "2026-01")).toBe("Dec 2025 – Jan 2026");
    expect(formatMonthRange("2026-06", "present")).toBe("Jun 2026 – present");
    expect(formatMonthRange("2026-06", "2026-06")).toBe("Jun 2026");
  });

  it("writes day spans", () => {
    expect(formatDayRange("2026-04-28", "2026-04-29")).toBe("28–29 Apr 2026");
    expect(formatDayRange("2026-04-30", "2026-05-01")).toBe("30 Apr – 1 May 2026");
    expect(formatDayRange("2026-04-28", "2026-04-28")).toBe("28 Apr 2026");
  });
});

describe("the tracks", () => {
  it("start in July 2023 and know dates up to EY's end, until the browser knows today", () => {
    expect(result.start).toBe("2023-07-01");
    expect(result.known).toBe("2026-08-01");
  });

  it("stack EY over United where they overlap, honestly: same start, both whole", () => {
    expect(track("work").lanes).toBe(2);
    expect(clip("united-airlines")).toMatchObject({ lane: 0, start: "2026-06-01", end: null });
    expect(clip("ey")).toMatchObject({ lane: 1, start: "2026-06-01", end: "2026-08-01" });
    // Tab order runs through time: EY ends first, so it comes before United.
    expect(track("work").clips.map((entry) => entry.id)).toEqual(["walkingtree", "truechip", "ey", "united-airlines"]);
  });

  it("name each clip, by the org's short name where content gives one", () => {
    expect(track("work").clips.map((entry) => [entry.title, entry.label])).toEqual([
      ["WalkingTree Technologies", "WalkingTree"],
      ["Truechip Solutions Pvt. Ltd.", "Truechip"],
      ["Ernst & Young (EY)", "EY"],
      ["United Airlines", "United Airlines"],
    ]);
    expect(clip("sci-2026").label).toBe("SCI-2026");
  });

  it("date the conference to the day, the degree as one clip and honors as year brackets", () => {
    expect(clip("sci-2026")).toMatchObject({ start: "2026-04-28", end: "2026-04-30", precision: "day", dates: "28–29 Apr 2026" });
    expect(track("education").clips).toHaveLength(1);
    expect(clip("manipal-university-jaipur")).toMatchObject({ start: "2023-07-01", end: "2027-08-01" });
    const honors = track("honors").clips;
    expect(honors.map((entry) => entry.dates)).toEqual(["2024", "2024", "2025", "2026"]);
    expect(honors.every((entry) => entry.precision === "year" && entry.start.endsWith("-01-01") && entry.end!.endsWith("-01-01"))).toBe(true);
    expect(honors.filter((entry) => entry.panel === "smart-india-hackathon")).toHaveLength(2);
    expect(track("honors").lanes).toBe(2);
  });
});

describe("the panels", () => {
  it("give each role its dates, location (only when known), summary and three highlights", () => {
    expect(panel("united-airlines")).toMatchObject({ dates: "Jun 2026 – present", location: null });
    expect(panel("ey")).toMatchObject({ dates: "Jun–Jul 2026", location: "Hybrid" });
    expect(panel("truechip")).toMatchObject({ dates: "Dec 2025 – Jan 2026" });
    expect(panel("walkingtree")).toMatchObject({ dates: "Jul–Aug 2025" });
    for (const role of data.experience) {
      expect(panel(role.id)).toMatchObject({ kind: "role", summary: role.summary.text, highlights: role.bullets.slice(0, 3).map((bullet) => bullet.text) });
    }
  });

  it("group metrics by the footnote that backs them, in the notes' own words", () => {
    const united = panel("united-airlines");
    if (united.kind !== "role") throw new Error("not a role");
    expect(united.groups.map((group) => ({ footnotes: group.footnotes, tokens: group.metrics.map((metric) => metric.token) }))).toEqual([
      { footnotes: [1], tokens: ["6", "2"] },
      { footnotes: [2], tokens: ["$0.08–0.11", "22–25%", "35"] },
    ]);
    expect(united.groups[1].metrics[0].parts).toEqual([
      { kind: "text", text: "$" },
      { kind: "number", value: 0.08, decimals: 2, group: false },
      { kind: "text", text: "–" },
      { kind: "number", value: 0.11, decimals: 2, group: false },
    ]);
    const truechip = panel("truechip");
    if (truechip.kind !== "role") throw new Error("not a role");
    expect(truechip.groups.map((group) => group.metrics.map((metric) => metric.token))).toEqual([["10+"], ["90%+", "~30%", "~25%"]]);
    const walkingtree = panel("walkingtree");
    if (walkingtree.kind !== "role") throw new Error("not a role");
    expect(walkingtree.groups[0].metrics[0].parts).toEqual([
      { kind: "number", value: 10000, decimals: 0, group: true },
      { kind: "text", text: "+" },
    ]);
  });

  it("label each role's visual in its notes' own words", () => {
    expect(panel("united-airlines")).toMatchObject({ visual: { kind: "tangle-to-map", calls: 2, documents: 6, cents: [8, 11], costLabel: "$0.08–0.11" } });
    expect(panel("ey")).toMatchObject({ visual: { kind: "route-segments" } });
    expect(panel("truechip")).toMatchObject({
      visual: { kind: "module-blocks", modules: 10, modulesLabel: "10+", coverage: 90, coverageLabel: "90%+", defects: 30, defectsLabel: "~30%" },
    });
    expect(panel("walkingtree")).toMatchObject({ visual: { kind: "dashboard", users: 2500, usersLabel: "2,500+" } });
  });

  it("show the conference with its papers, and honors with their years", () => {
    expect(panel("sci-2026")).toMatchObject({ place: "Swinburne Vietnam, Hanoi", dates: "28–29 Apr 2026", proceedings: "Springer LNNS" });
    const conference = panel("sci-2026");
    if (conference.kind !== "research") throw new Error("not research");
    expect(conference.papers.map((paper) => paper.status)).toEqual(["Accepted · Presented April 2026", "Accepted · Presented April 2026"]);
    expect(panel("smart-india-hackathon")).toMatchObject({ years: "2024 and 2025", detail: { footnotes: [6] } });
  });
});

describe("the scrub", () => {
  it("shows each role and the conference in turn, the degree between them, EY on top in the overlap", () => {
    expect(map.stretches.map((stretch) => stretch.id)).toEqual([
      "manipal-university-jaipur",
      "walkingtree",
      "manipal-university-jaipur",
      "truechip",
      "manipal-university-jaipur",
      "sci-2026",
      "manipal-university-jaipur",
      "ey",
      "united-airlines",
    ]);
    expect(activeAt(map, monthsAt("2026-06-15"))).toBe("ey");
    expect(activeAt(map, monthsAt("2026-09-15"))).toBe("united-airlines");
  });

  it("gives every role and the conference the same share of the scroll, however long it ran", () => {
    const shares = map.stretches
      .map((stretch, i) => ({ id: stretch.id, share: map.knots[i + 1].p - map.knots[i].p }))
      .filter((entry) => entry.id !== "manipal-university-jaipur")
      .map((entry) => entry.share);
    for (const share of shares) expect(share).toBeCloseTo(shares[0], 10);
    // The two degree-only years pass in at most half a dwell.
    expect(map.knots[1].p).toBeLessThanOrEqual(EDIT.travelMax / map.dwells + 1e-9);
  });

  it("maps the scroll to the real time scale and back", () => {
    expect(timeAt(map, 0)).toBe(monthsAt(result.start));
    expect(timeAt(map, 1)).toBe(monthsAt(TODAY));
    for (const p of [0.1, 0.33, 0.5, 0.8]) expect(progressAt(map, timeAt(map, p))).toBeCloseTo(p, 10);
  });

  it("jumps to the middle of a clip's own stretch, or a honor's year", () => {
    const united = map.stretches.find((stretch) => stretch.id === "united-airlines")!;
    expect(targetOf(map, scrub("united-airlines"))).toBeCloseTo((progressAt(map, united.from) + progressAt(map, united.to)) / 2, 10);
    expect(activeAt(map, timeAt(map, targetOf(map, scrub("walkingtree"))))).toBe("walkingtree");
    expect(timeAt(map, targetOf(map, scrub("deans-list")))).toBeCloseTo(monthsAt("2024-07-01"), 0);
  });

  it("plays at one dwell per few seconds, and J and L shuttle 1×, 2×, 4×", () => {
    expect(playStep(map, 0, 1, EDIT.playSeconds)).toBeCloseTo(1 / map.dwells, 10);
    expect(playStep(map, 0.99, 4, 10)).toBe(1);
    expect(playStep(map, 0.01, -1, 10)).toBe(0);
    expect([shuttle(0, 1), shuttle(1, 1), shuttle(2, 1), shuttle(4, 1)]).toEqual([1, 2, 4, 4]);
    expect([shuttle(2, -1), shuttle(-1, -1), shuttle(-2, -1)]).toEqual([-1, -2, -4]);
  });
});

describe("where it pins", () => {
  it("uses one query in CSS and in the controller", () => {
    const tokens = readFileSync(path.join(process.cwd(), "styles", "tokens.css"), "utf8");
    const variant = /@custom-variant edit-pinned \(@media ([^;]+)\);/.exec(tokens)?.[1];
    expect(variant).toBe(`${EDIT.query} and (scripting: enabled) and (prefers-reduced-motion: no-preference)`);
  });
});
