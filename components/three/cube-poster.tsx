/** The test cube's poster: a flat isometric cube in the finish accent, drawn in SVG. */
export function CubePoster() {
  return (
    <svg viewBox="0 0 120 120" className="size-full text-accent" aria-hidden="true">
      <path d="M60 18 96 39 60 60 24 39Z" fill="currentColor" opacity="0.55" />
      <path d="M24 39 60 60v42L24 81Z" fill="currentColor" opacity="0.8" />
      <path d="M96 39 60 60v42l36-21Z" fill="currentColor" />
    </svg>
  );
}
