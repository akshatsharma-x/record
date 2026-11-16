import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Citations as CitationSet, CiteRun } from "@/lib/cite";

const STYLES = [
  { value: "apa", label: "APA" },
  { value: "ieee", label: "IEEE" },
  { value: "bibtex", label: "BibTeX" },
] as const;

function Runs({ runs }: { runs: readonly CiteRun[] }) {
  return runs.map((run, i) => (run.italic ? <i key={i}>{run.text}</i> : <span key={i}>{run.text}</span>));
}

/**
 * A paper's citation in APA, IEEE and BibTeX (DESIGN.md §7.5). All three are in the HTML;
 * the segmented control's radios show one (styles/components.css), with or without
 * JavaScript. Copy puts the shown one on the clipboard, with its italics where the page
 * pastes rich text, and the Island confirms it (lib/research-behavior.ts, attachActions). It needs
 * JavaScript, so it's hidden without it.
 */
export function Citations({ citations, name }: { citations: CitationSet; name: string }) {
  return (
    <div className="citations">
      <SegmentedControl label="Citation style" name={name} options={STYLES} defaultValue="apa" />
      <div className="citation-texts">
        <p className="citation-text" data-style="apa" data-label="APA">
          <Runs runs={citations.apa} />
        </p>
        <p className="citation-text" data-style="ieee" data-label="IEEE">
          <Runs runs={citations.ieee} />
        </p>
        <pre className="citation-text citation-bibtex" data-style="bibtex" data-label="BibTeX">
          <code>{citations.bibtex}</code>
        </pre>
      </div>
      <Button variant="secondary" className="needs-js" data-copy-citation="">
        Copy
      </Button>
    </div>
  );
}
