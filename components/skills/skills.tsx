import { Behavior } from "@/components/ui/behavior";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/layout";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Display, Lead } from "@/components/ui/type";
import { content } from "@/content";
import { skillsSection } from "@/content/derive";
import { Chip } from "./chip";
import { Cloud } from "./cloud";
import { CoreSix } from "./core-six";
import { SpecsSheet } from "./specs-sheet";

/**
 * Skills (DESIGN.md §7.7): the chip, the core six, then every skill two ways, a specs sheet
 * or a honeycomb cloud, from a segmented control whose radios CSS reads. Choosing a skill in
 * either shows where it's used: the page lights up the roles, projects and papers that name
 * it, and the Island offers a jump to the first. /specs has the whole sheet.
 */
export function Skills() {
  const { copy } = content;
  const { layers, core, categories } = skillsSection(content);
  const { views } = copy.skills;
  // The cloud starts from the core six in the middle, then the layers, top to bottom.
  const cloud = [...core, ...layers.flatMap((layer) => layer.skills.filter((skill) => !skill.core))];
  return (
    <Section
      id="skills"
      name="Skills"
      surface="dark"
      className="skills"
      aria-labelledby="skills-title"
      data-jump={copy.skills.showMe.jump}
      data-none={copy.skills.showMe.none}
      data-clear={copy.skills.showMe.clear}
    >
      <Container className="skills-head">
        <Display id="skills-title">{copy.skills.headline}</Display>
        {copy.skills.sub ? <Lead tone="fg-2">{copy.skills.sub}</Lead> : null}
      </Container>
      <Chip layers={layers} />
      <Container className="skills-body">
        <CoreSix skills={core} />
        <div className="skills-views">
          <SegmentedControl
            label={views.label}
            name="skills-view"
            className="skills-switch"
            defaultValue="specs"
            options={[
              { value: "specs", label: views.specs },
              { value: "cloud", label: views.cloud },
            ]}
          />
          <div className="skills-view" data-view="specs">
            <SpecsSheet rows={categories.map((category) => ({ id: category.id, name: category.name, skills: category.skills }))} interactive />
          </div>
          <div className="skills-view" data-view="cloud">
            <Cloud skills={cloud} label={views.cloud} />
          </div>
          <p className="sr-only" role="status" data-show-me-status />
        </div>
        <Button variant="link" href="/specs" className="skills-specs-link">
          {copy.skills.specsLink}
        </Button>
      </Container>
      <Behavior section="skills" />
    </Section>
  );
}
