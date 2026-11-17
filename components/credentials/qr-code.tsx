import { qrCode } from "@/lib/qr";

/**
 * A verify URL as a QR code (DESIGN.md §7.8), drawn at build time: dark modules on white
 * paper with its quiet zone, crisp at any size, so a phone can scan the screen.
 */
export function QrCode({ url, label }: { url: string; label: string }) {
  const { size, d } = qrCode(url);
  return (
    <svg className="pass-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect className="pass-qr-paper" width={size} height={size} rx={size * 0.08} />
      <path className="pass-qr-ink" d={d} />
    </svg>
  );
}
