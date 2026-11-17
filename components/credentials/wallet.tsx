import type { CSSProperties } from "react";
import { content } from "@/content";
import type { Pass } from "@/content/derive";
import { PassCard, type PassMarks } from "./pass";

const vars = (values: Record<string, number | string>) => values as CSSProperties;

/**
 * A pass's color (DESIGN.md §7.8): the issuer's tone when content gives one, else the
 * finish's. Education wears the finish's own gradient; certificates without a tone take
 * the finish's other three in turn, so neighbors never match.
 */
function tones(passes: readonly Pass[]): string[] {
  let k = 0;
  return passes.map((pass) => (pass.tone ? "issuer" : pass.kind === "education" ? "0" : String((k++ % 3) + 1)));
}

/**
 * The wallet (DESIGN.md §7.8): Education, then each certificate, as passes. The server
 * renders them as a plain grid, which is what reduced motion and no JavaScript keep; the
 * behavior stacks them like a wallet app (lib/credentials-behavior.ts).
 */
export function Wallet({ passes, marks = {}, id = "wallet" }: { passes: readonly Pass[]; marks?: PassMarks; id?: string }) {
  const words = content.copy.credentials.wallet;
  const tone = tones(passes);
  return (
    <div className="wallet" data-count={passes.length} style={vars({ "--count": passes.length })}>
      {/* Its heading is for the outline (h2, then the passes, then Recognition.); the passes show what it is. */}
      <h3 className="sr-only" id={`${id}-title`}>
        {words.label}
      </h3>
      <ol className="wallet-stack" aria-labelledby={`${id}-title`}>
        {passes.map((pass, index) => (
          <PassCard key={pass.id} pass={pass} index={index} tone={tone[index]} marks={marks} />
        ))}
      </ol>
    </div>
  );
}
