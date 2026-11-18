import type { Illustration as IllustrationData } from "@/content/schema";
import { ColdChain } from "./cold-chain";
import { Haze } from "./haze";

/** What a reader who can't see it is told: the idea, in words, as the drawing shows it. */
function describe(illustration: IllustrationData): string {
  if (illustration.kind === "haze") {
    return "A city skyline in haze, over a line of fine-particle levels up to now and a forecast that runs on inside an uncertainty band, wider the further ahead it looks.";
  }
  const { stops } = illustration;
  const after = stops[Math.min(stops.length - 1, Math.ceil(stops.length / 2))];
  return `A route from ${stops[0]} to ${stops.at(-1)} with a dial of risk at each stop, over the temperature along the way. The temperature leaves its safe range on the way to ${after}, and the risk rises from there.`;
}

/**
 * A paper's concept illustration (DESIGN.md §7.5), captioned so it never reads as a
 * result. The hint says what to do with it.
 */
export function Illustration({ illustration, caption }: { illustration: IllustrationData; caption: string }) {
  return (
    <figure className="illustration" data-kind={illustration.kind}>
      <p className="sr-only">{describe(illustration)}</p>
      {illustration.kind === "cold-chain" ? <ColdChain stops={illustration.stops} factors={illustration.factors} /> : <Haze />}
      <figcaption className="illustration-caption">
        <span className="illustration-hint">{illustration.hint}</span>{" "}
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}
