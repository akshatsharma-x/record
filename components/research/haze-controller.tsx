"use client";

import { useEffect } from "react";
import { createHazeEngine } from "@/lib/haze";
import { forecastLabel, forecastPaths, HAZE, handleAt, hazeDensity, hazeX, hazeY, levelAt, stepTime, timeWords } from "@/lib/research";

/**
 * What moves in the haze (components/research/haze.tsx): the forecast's reach. Dragging
 * the handle (or its arrow keys) moves it, and the haze thickens or clears with the level
 * there. While its chapter plays, the scroll carries the handle from now to the horizon
 * until the visitor takes it. Elsewhere it opens on its final frame, and Step through taps
 * it along the forecast. It sets the server's markup's attributes; nothing re-renders.
 */
export function HazeController({ id, resolution }: { id: string; resolution: number }) {
  useEffect(() => {
    const root = document.getElementById(id);
    const canvas = root?.querySelector<HTMLCanvasElement>(".haze-canvas");
    const scene = root?.querySelector<HTMLElement>(".haze-scene");
    const input = root?.querySelector<HTMLInputElement>(".haze-handle");
    if (!root || !canvas || !scene || !input) return;
    const band = root.querySelector(".haze-band");
    const ahead = root.querySelector(".haze-ahead");
    const label = root.querySelector(".haze-label-forecast");
    const cursor = root.querySelector(".haze-cursor");
    const dot = root.querySelector(".haze-dot");
    const said = root.querySelector<HTMLElement>("[data-haze-said]");
    const button = root.querySelector<HTMLButtonElement>("[data-haze-step]");
    const engine = createHazeEngine(canvas);
    const span = HAZE.horizon - HAZE.now;
    let taken = false;
    let step = HAZE.steps.length - 1;
    let shown = Number.NaN;

    const draw = (time: number) => {
      if (time === shown) return;
      shown = time;
      const level = levelAt(time);
      const density = hazeDensity(level);
      const paths = forecastPaths(time);
      const where = forecastLabel(time);
      const x = String(hazeX(time));
      for (const [path, d] of [
        [band, paths.band],
        [ahead, paths.ahead],
      ] as const) {
        if (d) path?.setAttribute("d", d);
        else path?.removeAttribute("d");
      }
      label?.setAttribute("x", String(where.x));
      if (where.shown) label?.removeAttribute("visibility");
      else label?.setAttribute("visibility", "hidden");
      cursor?.setAttribute("x1", x);
      cursor?.setAttribute("x2", x);
      dot?.setAttribute("cx", x);
      dot?.setAttribute("cy", String(hazeY(level)));
      input.value = String(Math.round(((time - HAZE.now) / span) * resolution));
      input.setAttribute("aria-valuetext", timeWords(time));
      scene.style.setProperty("--density", density.toFixed(3));
      engine.setDensity(density);
    };
    draw(HAZE.horizon);

    const onInput = () => {
      taken = true;
      draw(HAZE.now + (Number(input.value) / resolution) * span);
    };
    // While the chapter is pinned, its play moves the handle, unless the visitor has it.
    const chapter = root.closest(".chapter");
    const onPlay = (event: Event) => {
      const play = (event as CustomEvent<number>).detail;
      if (play <= 0) taken = false;
      if (!taken) draw(handleAt(play));
    };
    // Tap to step: from now to the horizon, said aloud.
    const onStep = () => {
      step = (step + 1) % HAZE.steps.length;
      taken = true;
      draw(stepTime(step));
      if (said) said.textContent = timeWords(stepTime(step));
    };

    input.addEventListener("input", onInput);
    chapter?.addEventListener("chapterplay", onPlay);
    button?.addEventListener("click", onStep);
    return () => {
      engine.destroy();
      input.removeEventListener("input", onInput);
      chapter?.removeEventListener("chapterplay", onPlay);
      button?.removeEventListener("click", onStep);
    };
  }, [id, resolution]);

  return null;
}
