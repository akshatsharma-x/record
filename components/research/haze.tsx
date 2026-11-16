import { type CSSProperties, useId } from "react";
import { Button } from "@/components/ui/button";
import { forecastLabel, forecastPaths, HAZE, hazeDensity, hazeLine, hazeX, hazeY, levelAt, skyline, timeWords } from "@/lib/research";
import { HazeController } from "./haze-controller";

const vars = (values: Record<string, number | string>) => values as CSSProperties;
const { scene: SCENE, chart: CHART } = HAZE;
/** The handle's input runs over the forecast in this many steps. */
export const HAZE_RESOLUTION = 1000;

/**
 * The PM2.5 paper's idea (DESIGN.md §7.5): a minimal skyline in a particle haze over the
 * level of fine particles, observed up to now, then forecast inside an uncertainty band
 * that widens the further ahead it looks. Every shape is an illustration, and nothing is a
 * number.
 *
 * It's all rendered here, on the server, at its final frame: the forecast reaching the
 * horizon. ./haze-controller.tsx moves the reach and draws the particles.
 */
export function Haze() {
  const id = useId();
  const nowX = hazeX(HAZE.now);
  const time = HAZE.horizon;
  const level = levelAt(time);
  const paths = forecastPaths(time);
  const label = forecastLabel(time);
  return (
    <div className="haze" id={id}>
      {/* The final frame's haze, until the canvas draws it. */}
      <div className="haze-scene" style={vars({ "--aspect": `${SCENE.width} / ${SCENE.height}`, "--density": hazeDensity(level) })}>
        <div className="haze-glow" />
        <svg className="haze-skyline" viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          {skyline(SCENE.width, SCENE.height).map((building) => (
            <rect key={building.x} x={building.x} y={building.y} width={building.w} height={building.h} />
          ))}
        </svg>
        <canvas className="haze-canvas" aria-hidden="true" />
      </div>

      <div
        className="haze-chart"
        style={vars({
          "--aspect": `${CHART.width} / ${CHART.height}`,
          "--from": nowX / CHART.width,
          "--to": CHART.right / CHART.width,
          "--axis": CHART.axis / CHART.height,
        })}
      >
        <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} aria-hidden="true">
          <line className="haze-axis" x1={CHART.left} x2={CHART.right} y1={CHART.axis} y2={CHART.axis} />
          <path className="haze-band" d={paths.band} />
          <path className="haze-past" d={`M${hazeLine(0, HAZE.now).join("L")}`} />
          <path className="haze-ahead" d={paths.ahead} />
          <line className="haze-now" x1={nowX} x2={nowX} y1={CHART.top - 8} y2={CHART.axis} />
          <text className="haze-label" x={nowX} y={CHART.top - 14} textAnchor="middle">
            Now
          </text>
          <text
            className="haze-label haze-label-forecast"
            x={label.x}
            y={CHART.top - 14}
            textAnchor="middle"
            visibility={label.shown ? undefined : "hidden"}
          >
            Forecast
          </text>
          <line className="haze-cursor" x1={hazeX(time)} x2={hazeX(time)} y1={CHART.top - 8} y2={CHART.axis} />
          <circle className="haze-dot" cx={hazeX(time)} cy={hazeY(level)} r="5" />
        </svg>
        <input
          type="range"
          className="haze-handle"
          min={0}
          max={HAZE_RESOLUTION}
          step={1}
          defaultValue={HAZE_RESOLUTION}
          aria-label="Forecast time"
          aria-valuetext={timeWords(time)}
        />
      </div>

      <div className="illustration-steps">
        <Button variant="secondary" data-haze-step="">
          Step through
        </Button>
        <p className="sr-only" aria-live="polite" data-haze-said="" />
      </div>
      <HazeController id={id} resolution={HAZE_RESOLUTION} />
    </div>
  );
}
