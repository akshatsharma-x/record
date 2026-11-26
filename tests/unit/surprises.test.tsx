// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countingFormatter } from "@/components/ui/counter";
import { content } from "@/content";
import { compareTable } from "@/content/derive";
import { resetIsland, useIsland } from "@/lib/island/store";
import { GRID_MARKS, gridLegend } from "@/lib/page-modes";
import { findPhoneNumbers } from "@/lib/privacy";
import { phraseOf, secretCommands, secretFor } from "@/lib/search/secrets";
import { SURPRISES } from "@/lib/surprises";
import { announceClearSkies } from "@/lib/surprises/clear-skies";
import { FROZEN_MS, nineFortyOne } from "@/lib/surprises/command-941";
import { rippleAt } from "@/lib/surprises/command-clarity";
import { helloMessage, sayHello } from "@/lib/surprises/console-hello";
import { overrides } from "@/lib/surprises/define";
import { devanagariName } from "@/lib/surprises/devanagari-name";
import { clockTime, freezeClocks } from "@/lib/use-now";

/**
 * The surprises (DESIGN.md §8, Part 13): each has a file, a flag, words in content, an entry
 * in /colophon's list and an end-to-end test of its own (tests/e2e/surprises.spec.ts). The
 * logic that's pure is pinned here, and so is the one that ships off: the Devanagari name.
 */

const ROOT = process.cwd();
const FOLDER = path.join(ROOT, "lib/surprises");
/** The folder's files that aren't surprises: the definition, the catalog and a helper. */
const NOT_SURPRISES = new Set(["define.ts", "index.ts", "pointer.ts"]);
const ids = SURPRISES.map((surprise) => surprise.id);

// jsdom has no matchMedia, IntersectionObserver or ResizeObserver; the pages' client parts use them.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  sessionStorage.clear();
  resetIsland();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the catalog", () => {
  it("has one surprise per file, each named for its file, and no file left out", () => {
    const files = readdirSync(FOLDER).filter((file) => file.endsWith(".ts") && !NOT_SURPRISES.has(file));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.toSorted()).toEqual(files.map((file) => file.replace(/\.ts$/, "")).toSorted());
    for (const file of files) {
      const source = readFileSync(path.join(FOLDER, file), "utf8");
      // Exactly one definition, and it's this file's.
      expect(source.match(/\bdefine\(\{/g), file).toHaveLength(1);
      expect(source, file).toContain(`id: "${file.replace(/\.ts$/, "")}"`);
    }
  });

  it("gives each a boolean flag, with nothing overriding them in this build", () => {
    for (const surprise of SURPRISES) {
      expect(typeof surprise.on, surprise.id).toBe("boolean");
      expect(surprise.on, surprise.id).toBe(surprise.shipped);
    }
  });

  it("ships every surprise on but the Devanagari name, which waits for Akshat's approval", () => {
    expect(devanagariName.shipped).toBe(false);
    expect(devanagariName.on).toBe(false);
    expect(SURPRISES.filter((surprise) => !surprise.shipped).map((surprise) => surprise.id)).toEqual(["devanagari-name"]);
  });

  it("has words in content for each, and none for a surprise that doesn't exist", () => {
    const items = content.copy.colophon.things.items;
    expect(Object.keys(items).toSorted()).toEqual(ids.toSorted());
    for (const id of ids) {
      expect(items[id].name.trim(), id).not.toBe("");
      expect(items[id].find.trim(), id).not.toBe("");
    }
  });

  it("has an end-to-end test of its own for each", () => {
    const spec = readFileSync(path.join(ROOT, "tests/e2e/surprises.spec.ts"), "utf8");
    for (const id of ids) expect(spec, id).toContain(`[surprise:${id}]`);
  });
});

describe("a build's overrides", () => {
  it('reads "+a,-b": on, off, and on again for a bare name', () => {
    expect(overrides("+devanagari-name, -command-clarity,design-grid")).toEqual(
      new Map([
        ["devanagari-name", true],
        ["command-clarity", false],
        ["design-grid", true],
      ]),
    );
  });

  it("is empty when nothing is set", () => {
    expect(overrides(undefined).size).toBe(0);
    expect(overrides(" , ").size).toBe(0);
  });
});

describe("/colophon's things to find", () => {
  it("lists exactly the surprises a visitor can find, in order, behind a closed spoiler", async () => {
    const { default: ColophonPage } = await import("@/app/colophon/page");
    const { container } = render(<ColophonPage />);
    const spoiler = container.querySelector("details.things-spoiler");
    expect(spoiler).not.toBeNull();
    expect(spoiler?.hasAttribute("open")).toBe(false);
    const listed = Array.from(container.querySelectorAll("li[data-surprise]"), (item) => item.getAttribute("data-surprise"));
    // Off: the Devanagari name. Waiting: "retro", until content has the edition's address.
    expect(listed).toEqual(ids.filter((id) => id !== "devanagari-name" && id !== "command-retro"));
    expect(container.textContent).not.toMatch(/\b(null|undefined|TODO)\b/);
  });
});

describe("Search's secret commands", () => {
  it("serves the ones that are on, and 'retro' only once content has the edition's address", () => {
    expect(secretCommands(content).map((command) => command.id)).toEqual([
      "command-hello",
      "command-941",
      "command-sudo",
      "command-compare",
      "command-clarity",
    ]);
    const retro = "https://retrograde.example";
    const withRetro = { ...content, profile: { ...content.profile, links: { ...content.profile.links, retrograde: retro } } };
    expect(secretCommands(withRetro).find((command) => command.id === "command-retro")?.href).toBe(retro);
  });

  it("speaks content's words, and goes where each says", () => {
    const words = content.copy.surprises.commands;
    const byId = new Map(secretCommands(content).map((command) => [command.id, command]));
    expect(byId.get("command-hello")?.answer).toBe("Hello to you too.");
    expect(byId.get("command-sudo")).toMatchObject({ phrase: words.sudo.phrase, answer: "Permission granted.", href: "/#contact" });
    expect(byId.get("command-compare")?.href).toBe("/compare");
  });

  it("shows one only for its whole phrase, never part of it or anything like it", () => {
    const secrets = secretCommands(content);
    expect(secretFor("hello", secrets)?.id).toBe("command-hello");
    expect(secretFor("  HELLO ", secrets)?.id).toBe("command-hello");
    expect(secretFor("sudo   hire  Akshat", secrets)?.id).toBe("command-sudo");
    expect(secretFor("9:41", secrets)?.id).toBe("command-941");
    for (const near of ["", "hell", "hello there", "sudo", "sudo hire", "941", "compar", "clarity!"]) {
      expect(secretFor(near, secrets), near).toBeNull();
    }
    expect(phraseOf("  Sudo\thire   AKSHAT ")).toBe("sudo hire akshat");
  });
});

describe("9:41", () => {
  const zone = content.profile.location.timeZone;
  const shown = (at: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", day: "numeric" }).format(at);

  it("is 9:41 in the morning today, on Akshat's clocks", () => {
    // 21:41 in India on 17 November 2026.
    const at = nineFortyOne(zone, new Date("2026-11-17T16:11:00Z"));
    expect(at.toISOString()).toBe("2026-11-17T04:11:00.000Z");
    expect(shown(at)).toBe("17, 9:41 AM");
    // Just after midnight in India, it's already the 18th there.
    expect(shown(nineFortyOne(zone, new Date("2026-11-17T19:00:00Z")))).toBe("18, 9:41 AM");
  });

  it("holds every clock there for five seconds, then lets time go on", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T16:11:00Z"));
    const at = nineFortyOne(zone);
    freezeClocks(at, FROZEN_MS);
    expect(clockTime()).toEqual(at);
    vi.advanceTimersByTime(FROZEN_MS - 1);
    expect(clockTime()).toEqual(at);
    vi.advanceTimersByTime(2);
    expect(clockTime().getTime()).toBeGreaterThan(at.getTime());
    expect(FROZEN_MS).toBe(5000);
  });
});

describe("clarity", () => {
  it("softens the page first, then spreads focus from the pointer to the farthest corner", () => {
    expect(rippleAt(0)).toEqual({ opacity: 0, spread: 0 });
    expect(rippleAt(0.15)).toEqual({ opacity: 1, spread: 0 });
    expect(rippleAt(1)).toEqual({ opacity: 1, spread: 1 });
    let last = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const { spread } = rippleAt(t);
      expect(spread).toBeGreaterThanOrEqual(last);
      last = spread;
    }
  });
});

describe("the design grid", () => {
  it("marks 734, 1068 and 1440, and says what it shows", () => {
    expect(GRID_MARKS).toEqual([734, 1068, 1440]);
    expect(gridLegend("12", "24px", 1440)).toBe("12 columns · 24px gutters · 8pt baseline · 1440px");
  });
});

describe("the console's note", () => {
  const { profile } = content;
  const words = content.copy.surprises.console.greeting;

  it("is the monogram, the greeting, GitHub and the email, styled, with no phone number", () => {
    const [format, ...styles] = helloMessage("AS", words, profile.links.github, profile.email);
    expect(format).toContain("AS");
    expect(format).toContain("Hi, fellow engineer.");
    expect(format).toContain(profile.links.github);
    expect(format).toContain(profile.email);
    expect(styles).toHaveLength(3);
    expect(findPhoneNumbers(format)).toEqual([]);
  });

  it("says it once a session", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(sayHello("AS", words, profile.links.github, profile.email)).toBe(true);
    expect(sayHello("AS", words, profile.links.github, profile.email)).toBe(false);
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe("clear skies", () => {
  it("says so on the Island once a session, however often the sky clears", () => {
    announceClearSkies(content.copy.surprises.clearSkies);
    expect(useIsland.getState().current?.title).toBe("Clear skies ahead.");
    resetIsland();
    announceClearSkies(content.copy.surprises.clearSkies);
    expect(useIsland.getState().current).toBeNull();
  });
});

describe("/compare", () => {
  it("has a column for each year from the first dated entry to the last known one", () => {
    const table = compareTable(content);
    expect(table.years).toEqual([2023, 2024, 2025, 2026]);
    expect(table.rows.map((row) => row.id)).toEqual(["studying", "internships", "papers", "honors", "stack"]);
    expect(table.rows.map((row) => row.label)).toEqual(Object.values(content.copy.surprises.compare.rows));
    expect(content.copy.surprises.compare.footnote).toBe("Derived from dated entries; nothing estimated.");
  });

  it("builds each cell from dated entries only: internships to date only grow", () => {
    const table = compareTable(content);
    const internships = table.rows.find((row) => row.id === "internships")!;
    const counts = table.years.map((year) => internships.cells[year].length);
    expect(counts).toEqual(counts.toSorted((a, b) => a - b));
    expect(counts.at(-1)).toBe(content.experience.filter((role) => role.kind === "internship").length);
    const papers = table.rows.find((row) => row.id === "papers")!;
    expect(table.years.flatMap((year) => papers.cells[year]).toSorted()).toEqual(content.publications.map((paper) => paper.title).toSorted());
    const honors = table.rows.find((row) => row.id === "honors")!;
    for (const achievement of content.achievements) {
      for (const year of achievement.years) expect(honors.cells[year]).toContain(achievement.title);
    }
  });

  it("grows a column when a new year comes", () => {
    expect(compareTable(content, new Date("2027-03-01T12:00:00Z")).years.at(-1)).toBe(2027);
  });
});

describe("the résumé edition", () => {
  it("is one page of everything but a phone number", async () => {
    const { ResumeEdition } = await import("@/components/print/resume-edition");
    const { container } = render(<ResumeEdition />);
    const text = container.textContent ?? "";
    const { profile } = content;
    expect(text).toContain(profile.name);
    expect(text).toContain(profile.email);
    expect(text).toContain("linkedin.com/");
    expect(text).toContain("github.com/");
    for (const role of content.experience) expect(text).toContain(role.org);
    for (const paper of content.publications) expect(text).toContain(paper.title);
    // The bento's first four projects and the two latest certificates: all of them ran to a second page (Part 20).
    for (const project of content.projects.slice(0, 4)) expect(text).toContain(project.name);
    for (const project of content.projects.slice(4)) expect(text).not.toContain(project.name);
    const { latestCertificates } = await import("@/components/print/resume-edition");
    const latest = latestCertificates(content.certificates);
    expect(latest.map((certificate) => certificate.id)).toEqual(["claude-code-in-action", "aws-cloud-practitioner-essentials"]);
    for (const certificate of latest) expect(text).toContain(certificate.title);
    for (const achievement of content.achievements) expect(text).toContain(achievement.title);
    expect(text).toContain("Manipal University Jaipur");
    expect(Array.from(container.querySelectorAll("h2"), (heading) => heading.textContent)).toEqual([
      "Experience",
      "Research",
      "Projects",
      "Skills",
      "Education",
      "Honors and certificates",
    ]);
    expect(findPhoneNumbers(container.innerHTML)).toEqual([]);
    // No QR code until content has the site's address.
    expect(content.profile.links.site).toBeNull();
    expect(container.querySelector(".resume-qr")).toBeNull();
  });

  it("adds a QR code back to the site once content has its address", async () => {
    vi.resetModules();
    vi.doMock("@/content", async (importOriginal) => {
      const original = await importOriginal<typeof import("@/content")>();
      const links = { ...original.content.profile.links, site: "https://akshat.example" };
      return { ...original, content: { ...original.content, profile: { ...original.content.profile, links } } };
    });
    try {
      const { ResumeEdition } = await import("@/components/print/resume-edition");
      const { container } = render(<ResumeEdition />);
      expect(container.querySelector(".resume-qr svg")).not.toBeNull();
      expect(container.querySelector(".resume-qr figcaption")?.textContent).toBe("akshat.example");
      expect(container.querySelector(".resume-contact")?.textContent).toContain("akshat.example");
    } finally {
      vi.doUnmock("@/content");
      vi.resetModules();
    }
  });
});

describe("the Devanagari name", () => {
  it("is off: the name is only the name", async () => {
    const { Hero } = await import("@/components/hero/hero");
    const { container } = render(<Hero photo={null} />);
    const name = container.querySelector("h1")!;
    expect(name.hasAttribute("data-morph")).toBe(false);
    expect(container.querySelector(".hero-devanagari")).toBeNull();
    expect(container.querySelector(".hero-name-note")).toBeNull();
  });

  it("when it's approved, a click turns Akshat into अक्षत, with what it means, and back", async () => {
    vi.resetModules();
    vi.doMock("@/lib/surprises/devanagari-name", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/surprises/devanagari-name")>()),
      devanagariName: { id: "devanagari-name", section: "hero", on: true, shipped: false },
    }));
    // The name is in view at once, so its behavior loads (components/ui/behavior.tsx).
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: (entries: { isIntersecting: boolean }[]) => void) {}
        observe() {
          this.callback([{ isIntersecting: true }]);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    try {
      const { Hero } = await import("@/components/hero/hero");
      const { container } = render(<Hero photo={null} />);
      await vi.dynamicImportSettled();
      const name = container.querySelector("h1")!;
      const devanagari = container.querySelector(".hero-devanagari")!;
      const note = container.querySelector(".hero-name-note")!;
      expect(devanagari.textContent).toBe("अक्षत");
      expect(devanagari.getAttribute("lang")).toBe("sa");
      // Assistive tech still hears the name, and the note is the eye's alone.
      expect(devanagari.getAttribute("aria-hidden")).toBe("true");
      expect(note.textContent).toBe("Sanskrit for 'unbroken'");
      expect(note.getAttribute("aria-hidden")).toBe("true");
      fireEvent.click(name);
      expect(name.hasAttribute("data-morphed")).toBe(true);
      expect(note.hasAttribute("data-shown")).toBe(true);
      fireEvent.click(name);
      expect(name.hasAttribute("data-morphed")).toBe(false);
      expect(note.hasAttribute("data-shown")).toBe(false);
    } finally {
      vi.doUnmock("@/lib/surprises/devanagari-name");
      vi.resetModules();
    }
  });
});

describe("the count-up", () => {
  it("counts in the final value's own precision, so 4 never shows as 3.999", () => {
    expect(countingFormatter(4).format(3.999)).toBe("4");
    expect(countingFormatter(4).format(1.4)).toBe("1");
    expect(countingFormatter(2500).format(1234.5)).toBe("1,235");
    expect(countingFormatter(8.79, { minimumFractionDigits: 2 }).format(3.14159)).toBe("3.14");
  });
});
