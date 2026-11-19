import type { Metadata, Viewport } from "next";
import { LazyAnalytics } from "@/components/analytics/lazy-analytics";
import { Cursor } from "@/components/cursor/cursor";
import { Island } from "@/components/island/island";
import { PageModes } from "@/components/page-modes/page-modes";
import { ResumeEdition } from "@/components/print/resume-edition";
import { Search } from "@/components/search/search";
import { SurfaceController } from "@/components/surface/surface-controller";
import { PreferencesSync } from "@/components/theme/preferences-sync";
import { ConsoleHello } from "@/components/surprises/console-hello";
import { StageProvider } from "@/components/three/stage";
import { content } from "@/content";
import { fontVariables } from "@/lib/fonts";
import { DEFAULT_FINISH, PREFERENCES_SCRIPT } from "@/lib/preferences";
import { consoleHello } from "@/lib/surprises/console-hello";
import { siteUrl } from "@/lib/site";
import { resumeEdition } from "@/lib/surprises/resume-edition";
import "@/styles/globals.css";

/**
 * Edge to edge (DESIGN.md §2, Part 15): with viewport-fit=cover the safe-area insets the
 * layout already reads (the Island, the hero's cue and pause, the gutters) are real, so the
 * dark hero runs under the notch in landscape while every word and control stays clear of it.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * What every page shares (Part 16). Each page says its own canonical address and share
 * card (lib/site.ts, pageMetadata), so none inherits the home page's. iOS mustn't turn a run
 * of digits into a phone link: there's no phone number here, and nothing should look like one.
 */
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: content.profile.name,
  // Pages with their own (a paper's TL;DR) override it.
  description: content.profile.headline,
  applicationName: content.profile.name,
  authors: [{ name: content.profile.name, url: "/" }],
  creator: content.profile.name,
  formatDetection: { telephone: false, address: false, email: false },
};

/**
 * The document. The head script applies the saved theme and finish before the first
 * paint (lib/preferences.ts), so <html> carries attributes React didn't render:
 * suppressHydrationWarning accepts them. Layers, bottom to top (§4.9): the surface
 * backdrop, the shared 3D stage, the content, then the Island (§6.2). Search (§6.3), a
 * case study opened over the page (the modal slot, §7.6) and the cursor (§6.1) live in the
 * top layer. The résumé edition is what prints.
 */
export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-theme-choice="system"
      data-finish={DEFAULT_FINISH}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body>
        {/* The first stop: past the Island's eleven to the page itself (WCAG 2.4.1, Part 17). */}
        <a href="#main" className="skip-link">
          {content.copy.skip}
        </a>
        <PreferencesSync />
        <SurfaceController />
        <Island initials={content.profile.initials} />
        <StageProvider>
          <div className="content-layer">{children}</div>
        </StageProvider>
        {modal}
        <PageModes />
        <Search />
        {resumeEdition.on ? <ResumeEdition /> : null}
        <Cursor />
        {/* Only where Vercel serves it: anywhere else its script isn't there to load (Part 16). */}
        {process.env.VERCEL ? <LazyAnalytics /> : null}
        {consoleHello.on ? (
          <ConsoleHello
            initials={content.profile.initials}
            greeting={content.copy.surprises.console.greeting}
            github={content.profile.links.github}
            email={content.profile.email}
          />
        ) : null}
      </body>
    </html>
  );
}
