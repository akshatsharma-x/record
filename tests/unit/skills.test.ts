/**
 * Skills (DESIGN.md §7.7): the chip's layers and its one projection, the core six and their
 * evidence links, the cloud's honeycomb and fisheye, and the schema's checks.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { data } from "@/content/data";
import { evidenceHref, evidenceTarget, monogram, skillsOf, skillsSection } from "@/content/derive";
import { ContentSchema } from "@/content/schema";
import { assembledTop, CHIP, explodedTop, explodedView, LAYERS, phase, PHASES, project, sceneProgress, slab } from "@/lib/chip";
import { FISHEYE, fisheye, spiral } from "@/lib/honeycomb";
import { island, resetIsland, useIsland } from "@/lib/island/store";
import { iconPath, skillIconSprite } from "@/lib/skill-icon-sprite";

const section = skillsSection(content);
const skill = (name: string) => section.items.find((item) => item.name === name)!;

/** The content with one change at a path, as an editor might make it. */
function broken(at: (string | number)[], value: unknown) {
  const copy = structuredClone(data) as Record<string, unknown>;
  let node: Record<string | number, unknown> = copy;
  for (const key of at.slice(0, -1)) node = node[key] as Record<string | number, unknown>;
  node[at.at(-1)!] = value;
  const result = ContentSchema.safeParse(copy);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

describe("the chip", () => {
  it("explodes into the brief's six layers, top to bottom, each with its skill count", () => {
    expect(section.layers.map((layer) => layer.category)).toEqual([
      "AI & ML",
      "Data & analytics",
      "Frameworks & backend",
      "Languages",
      "Platforms & tools",
      "Foundations",
    ]);
    for (const layer of section.layers) {
      const category = content.skills.find((entry) => entry.name === layer.category)!;
      expect(layer.skills.map((item) => item.name)).toEqual(category.skills.map((item) => item.name));
      expect(layer.count).toBe(`${category.skills.length} skills`);
    }
    expect(LAYERS).toHaveLength(section.layers.length);
  });

  it("stacks tight when assembled and evenly when exploded", () => {
    expect(assembledTop(LAYERS.length - 1)).toBeCloseTo(LAYERS.at(-1)!.thickness, 6);
    for (let i = 1; i < LAYERS.length; i++) {
      expect(assembledTop(i - 1) - assembledTop(i)).toBeCloseTo(LAYERS[i - 1].thickness, 6);
      expect(explodedTop(i - 1) - explodedTop(i)).toBeCloseTo(CHIP.gap, 6);
    }
  });

  it("projects the way the iso camera sees: turned 45°, seen from 30° above", () => {
    // The (+,+) corner of a square is on the right, the (−,−) on the left, level with each other.
    const right = project(1, 0, 1);
    const left = project(-1, 0, -1);
    expect(right.x).toBeCloseTo(Math.SQRT2, 6);
    expect(left.x).toBeCloseTo(-Math.SQRT2, 6);
    expect(right.y).toBeCloseTo(left.y, 6);
    // Higher is further up the screen, by cos 30°.
    expect(project(0, 1, 0).y).toBeCloseTo(-Math.cos(Math.PI / 6), 6);
    const top = slab(LAYERS[0], 0).top;
    expect(top[1].x).toBeGreaterThan(top[0].x);
    expect(top[2].y).toBeGreaterThan(top[0].y);
  });

  it("puts every label beside its layer's right corner, top to bottom, inside the view", () => {
    const view = explodedView();
    expect(view.anchors).toHaveLength(LAYERS.length);
    view.anchors.forEach((anchor, i) => {
      expect(anchor.x).toBeGreaterThan(0.5);
      expect(anchor.x).toBeLessThan(1);
      if (i > 0) expect(anchor.y).toBeGreaterThan(view.anchors[i - 1].y);
    });
    // The die's button sits over the die, in the middle across.
    expect(view.die.y).toBeLessThan(view.anchors[1].y);
    // The box leaves room on the left for a layer sliding out.
    const left = Math.min(...LAYERS.map((layer, i) => slab(layer, explodedTop(i)).left[0].x));
    expect(view.box.x / CHIP.unit).toBeLessThanOrEqual(left - CHIP.slide);
  });

  it("rises, turns and explodes as its stage scrolls, then holds", () => {
    expect(sceneProgress({ top: 0, height: 2000 }, 900)).toBe(0);
    expect(sceneProgress({ top: -1100, height: 2000 }, 900)).toBe(1);
    expect(sceneProgress({ top: 0, height: 800 }, 900)).toBe(1);
    expect(phase(0, PHASES.explode)).toBe(0);
    expect(phase(1, PHASES.explode)).toBe(1);
    expect(PHASES.explode[1]).toBeLessThan(1);
  });
});

describe("the core six and their evidence", () => {
  it("are the brief's six, in its order", () => {
    expect(section.core.map((item) => item.name)).toEqual(["Python", "TypeScript", "Java", "LangGraph", "Next.js", "FastAPI"]);
  });

  it("link each role, project and paper that uses them, to where it is", () => {
    const where = (name: string) => skill(name).evidence.map((hit) => `${hit.kind} ${hit.title} ${hit.href}`);
    expect(where("Python")).toEqual(["project Automated Resume Screening /work/resume-screening"]);
    expect(where("TypeScript")).toEqual(["role Ernst & Young (EY) /#ey-title"]);
    expect(where("Java")).toEqual(["role Truechip Solutions Pvt. Ltd. /#truechip-title", "role WalkingTree Technologies /#walkingtree-title"]);
    expect(where("LangGraph")).toEqual(["role United Airlines /#united-airlines-title"]);
    expect(where("Next.js")).toEqual(["role Ernst & Young (EY) /#ey-title", "project Cognivault AI /work/cognivault-ai"]);
    expect(where("FastAPI")).toEqual(["project Cognivault AI /work/cognivault-ai"]);
    expect(skill("machine learning").evidence.map((hit) => hit.href)).toEqual([
      "/#united-airlines-title",
      "/work/churn-prediction",
      "/research/food-waste-cold-chain",
      "/research/pm25-forecasting",
    ]);
  });

  it("aim every link at a page or an id that exists", () => {
    const ids = [
      ...content.experience.map((role) => `${role.id}-title`),
      ...content.projects.map((project) => `work-${project.slug}-title`),
      ...content.publications.map((paper) => `${paper.slug}-title`),
    ];
    const pages = [...content.projects.map((project) => `/work/${project.slug}`), ...content.publications.map((paper) => `/research/${paper.slug}`)];
    for (const item of section.items) {
      for (const hit of item.evidence) {
        expect(ids).toContain(hit.target);
        expect(hit.href.startsWith("/#") ? ids.includes(hit.href.slice(2)) : pages.includes(hit.href), `${item.name} → ${hit.href}`).toBe(true);
      }
    }
    expect(evidenceTarget("project", "quizmuj")).toBe("work-quizmuj-title");
    expect(evidenceHref("paper", "pm25-forecasting")).toBe("/research/pm25-forecasting");
  });

  it("know which skills a role, project or paper names, for Show me where", () => {
    expect(skillsOf(content, "project", "cognivault-ai")).toEqual(expect.arrayContaining(["next-js", "fastapi", "rag", "langchain"]));
    expect(skillsOf(content, "role", "ey")).toEqual(expect.arrayContaining(["typescript", "next-js"]));
  });

  it("show no bars, percentages or years: only where", () => {
    const source = readFileSync(path.join(process.cwd(), "components", "skills", "core-six.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(source).not.toMatch(/firstYear|percent|progress|years?\b|<meter|<progress/i);
  });
});

describe("the cloud", () => {
  it("lays a honeycomb out from the middle, ring by ring, each cell a step from a neighbor", () => {
    const cells = spiral(section.items.length);
    expect(cells).toHaveLength(section.items.length);
    expect(cells[0]).toMatchObject({ x: 0, y: 0, ring: 0 });
    expect(cells.slice(1, 7).every((cell) => cell.ring === 1)).toBe(true);
    for (const cell of cells.slice(1, 7)) expect(Math.hypot(cell.x, cell.y)).toBeCloseTo(1, 6);
    const keys = new Set(cells.map((cell) => `${cell.q},${cell.r}`));
    expect(keys.size).toBe(cells.length);
  });

  it("magnifies around the pointer, most at its middle, and never overlaps neighbors", () => {
    const middle = fisheye(0, 0, 0, 0);
    expect(middle.scale).toBeCloseTo(1 + FISHEYE.grow, 6);
    expect(fisheye(20, 0, 0, 0).scale).toBeCloseTo(1, 4);
    // Along a ray, two neighbors' gap stays at least the average of their sizes.
    for (let d = 0; d < 4; d += 0.25) {
      const a = fisheye(d, 0, 0, 0);
      const b = fisheye(d + 1, 0, 0, 0);
      expect(b.x - a.x).toBeGreaterThanOrEqual(((a.scale + b.scale) / 2) * 0.86);
    }
  });

  it("gives every skill a logo from the sprite or a short monogram", () => {
    for (const item of section.items) {
      if (item.icon) expect(iconPath(item.icon), item.name).toMatch(/^M/);
      else expect(item.monogram.length, item.name).toBeLessThanOrEqual(6);
    }
    expect(monogram("Power BI", [])).toBe("PB");
    expect(monogram("data structures & algorithms", ["DSA"])).toBe("DSA");
    expect(monogram("REST APIs", ["REST API"])).toBe("REST");
    expect(monogram("TF-IDF", [])).toBe("TF-IDF");
    const slugs = section.items.flatMap((item) => (item.icon ? [item.icon] : []));
    expect(skillIconSprite(slugs).match(/<symbol /g)).toHaveLength(new Set(slugs).size);
    expect(() => skillIconSprite(["not-a-logo"])).toThrow("Simple Icons has no");
  });
});

describe("the schema keeps the chip true to the skills", () => {
  it("fails a layer that isn't a category, and a category with no layer", () => {
    const layers = [...data.copy.skills.chip.layers];
    layers[3] = "Hobbies";
    expect(broken(["copy", "skills", "chip", "layers"], layers)).toEqual([
      'copy.skills.chip.layers.3: "Hobbies" isn\'t a skill category',
      'copy.skills.chip.layers: "Languages" has no layer',
    ]);
  });
});

describe("the Island's jump", () => {
  it("keeps an activity that persists until it's dismissed, with its link", () => {
    resetIsland();
    island.show({ title: "Python", action: { label: "Jump to Automated Resume Screening", href: "#work-resume-screening-title" }, persist: true });
    expect(useIsland.getState().current).toMatchObject({ title: "Python", action: { href: "#work-resume-screening-title" } });
    island.dismiss("Python");
    expect(useIsland.getState().current).toBeNull();
    resetIsland();
  });
});
