import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";

/**
 * The fallback fonts (DESIGN.md §4.4). Each font-family stack starts with the system
 * font, so Apple devices render SF Pro, New York and SF Mono and never request these.
 * Elsewhere they load with `preload: false` and size-adjusted fallbacks, so nothing shifts.
 */
export const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});

// The one weight the serif is set in, roman and italic, as static faces: the variable font's
// optical-size axis cost Chrome 279 KB for a few titles, against about 47 KB (Part 17).
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-newsreader",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono",
});

export const fontVariables = [inter.variable, newsreader.variable, jetbrainsMono.variable].join(" ");
