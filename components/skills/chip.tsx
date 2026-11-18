import { coreRipple } from "@/lib/surprises/core-ripple";
import type { CSSProperties } from "react";
import { Container } from "@/components/ui/layout";
import { content } from "@/content";
import type { SkillLayer } from "@/content/derive";
import { explodedView } from "@/lib/chip";
import { ChipPoster } from "./chip-poster";
import { ChipView } from "./chip-view";

const vars = (values: Record<string, number | string>) => values as CSSProperties;
const percent = (fraction: number) => Math.round(fraction * 10000) / 100;

/**
 * The chip (DESIGN.md §7.7): the 3D centerpiece, exploded into six layers of skills, each
 * labeled with its count. A label (or, in 3D, the layer itself) slides its layer out on
 * hover or focus, and its skills show beside it as a list. The die's button lights the
 * cores in a ripple. The labels and lists are DOM in every edition.
 */
export function Chip({ layers }: { layers: SkillLayer[] }) {
  const view = explodedView();
  const { chip } = content.copy.skills;
  return (
    <div className="chip" id="chip" data-scene="poster">
      <div className="chip-sticky">
        <Container className="chip-frame">
          <div className="chip-art" style={vars({ "--ratio": Math.round((view.box.width / view.box.height) * 1000) / 1000 })}>
            <div className="chip-box" style={vars({ "--aspect": `${view.box.width} / ${view.box.height}` })}>
              <ChipView poster={<ChipPoster ids={layers.map((layer) => layer.id)} />} label={chip.label} />
              {coreRipple.on ? (
                <button
                  type="button"
                  className="chip-die"
                  data-chip-die
                  aria-label={chip.cores}
                  style={vars({ "--x": `${percent(view.die.x)}%`, "--y": `${percent(view.die.y)}%` })}
                />
              ) : null}
            </div>
            <ol className="chip-labels">
              {layers.map((layer, i) => (
                <li
                  key={layer.id}
                  className="chip-anchor"
                  style={vars({ "--x": percent(view.anchors[i].x), "--y": `${percent(view.anchors[i].y)}%` })}
                >
                  <button type="button" className="chip-label" data-layer={layer.id} aria-expanded="false" aria-controls={`chip-${layer.id}`}>
                    <span className="chip-label-name">{layer.category}</span>{" "}
                    <span className="chip-label-count">{layer.count}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="chip-panel">
            {layers.map((layer) => (
              <section key={layer.id} id={`chip-${layer.id}`} className="chip-list" data-layer={layer.id} aria-label={layer.category}>
                <h3 className="chip-list-title">
                  {layer.category} <span className="chip-list-count">{layer.count}</span>
                </h3>
                <ul>
                  {layer.skills.map((skill) => (
                    <li key={skill.id}>{skill.label}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
}
