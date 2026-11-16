/**
 * A stand-in portrait for building and testing the hero's portrait edition (DESIGN.md
 * §7, Part 5) until Akshat's photo exists. It renders a softly side-lit studio bust as
 * the two layers the real photo will be cut into: the subject with alpha, and the
 * background plate. Output goes to public/_fixtures (gitignored); nothing ships.
 *
 *   node scripts/portrait-fixture.mjs
 */
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const W = 2400;
const H = 3200;
const out = path.join(process.cwd(), "public", "_fixtures", "portrait");

const plate = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="room" cx="38%" cy="34%" r="80%">
      <stop offset="0" stop-color="#4a4038"/>
      <stop offset="0.55" stop-color="#2a2420"/>
      <stop offset="1" stop-color="#121010"/>
    </radialGradient>
    <radialGradient id="bokeh"><stop offset="0" stop-color="#ffd9a6" stop-opacity="0.55"/><stop offset="0.7" stop-color="#ffcf91" stop-opacity="0.22"/><stop offset="1" stop-color="#ffcf91" stop-opacity="0"/></radialGradient>
    <radialGradient id="cool"><stop offset="0" stop-color="#a9c6ff" stop-opacity="0.35"/><stop offset="1" stop-color="#a9c6ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#room)"/>
  <circle cx="340" cy="520" r="170" fill="url(#bokeh)"/>
  <circle cx="620" cy="300" r="110" fill="url(#bokeh)"/>
  <circle cx="2010" cy="460" r="210" fill="url(#bokeh)"/>
  <circle cx="1790" cy="210" r="90" fill="url(#bokeh)"/>
  <circle cx="2190" cy="980" r="140" fill="url(#cool)"/>
  <circle cx="180" cy="1180" r="120" fill="url(#cool)"/>
  <rect y="${H * 0.78}" width="100%" height="${H * 0.22}" fill="#0c0b0b" opacity="0.55"/>
</svg>`;

const subject = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sweater" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#4c5560"/>
      <stop offset="0.35" stop-color="#2f353d"/>
      <stop offset="1" stop-color="#16191d"/>
    </linearGradient>
    <linearGradient id="neck" x1="0" x2="1">
      <stop offset="0" stop-color="#c79579"/>
      <stop offset="1" stop-color="#6e4a3a"/>
    </linearGradient>
    <radialGradient id="skin" cx="34%" cy="42%" r="75%">
      <stop offset="0" stop-color="#e2b394"/>
      <stop offset="0.5" stop-color="#b8846a"/>
      <stop offset="1" stop-color="#5e3e31"/>
    </radialGradient>
    <linearGradient id="hair" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#3a2c22"/>
      <stop offset="0.6" stop-color="#17110d"/>
      <stop offset="1" stop-color="#0b0807"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" x2="1">
      <stop offset="0" stop-color="#fff1df" stop-opacity="0.85"/>
      <stop offset="0.12" stop-color="#fff1df" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="M 60,3200 C 90,2700 260,2420 700,2280 C 860,2230 960,2160 990,2060 L 1410,2060 C 1440,2160 1540,2230 1700,2280 C 2140,2420 2310,2700 2340,3200 Z" fill="url(#sweater)"/>
  <path d="M 1010,1640 C 1020,1800 1010,1950 980,2080 L 1420,2080 C 1390,1950 1380,1800 1390,1640 Z" fill="url(#neck)"/>
  <path d="M 780,1150 C 780,800 960,640 1200,640 C 1440,640 1620,800 1620,1150 C 1620,1420 1560,1600 1420,1700 C 1340,1760 1260,1790 1200,1790 C 1140,1790 1060,1760 980,1700 C 840,1600 780,1420 780,1150 Z" fill="url(#skin)"/>
  <ellipse cx="1628" cy="1230" rx="58" ry="118" fill="#7a5243"/>
  <path d="M 770,1180 C 730,800 930,560 1200,560 C 1480,560 1680,790 1630,1180 C 1600,1040 1560,960 1500,920 C 1380,880 1250,900 1150,870 C 1020,840 900,900 840,1000 C 800,1060 780,1120 770,1180 Z" fill="url(#hair)"/>
  <path d="M 780,1150 C 780,800 960,640 1200,640 C 1440,640 1620,800 1620,1150 C 1620,1420 1560,1600 1420,1700 C 1340,1760 1260,1790 1200,1790 C 1140,1790 1060,1760 980,1700 C 840,1600 780,1420 780,1150 Z" fill="url(#rim)"/>
  <path d="M 60,3200 C 90,2700 260,2420 700,2280" fill="none" stroke="#fff1df" stroke-opacity="0.35" stroke-width="10"/>
</svg>`;

mkdirSync(out, { recursive: true });
const targets = [
  ["plate.png", plate],
  ["subject.png", subject],
];
for (const [name, svg] of targets) {
  const file = path.join(out, name);
  if (existsSync(file) && !process.argv.includes("--force")) continue;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
}
console.log(`Portrait fixture: ${out}`);
