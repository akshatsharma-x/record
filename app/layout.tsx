import type { Metadata } from "next";
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
import { resumeEdition } from "@/lib/surprises/resume-edition";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: content.profile.name,
  // Pages with their own (a paper's TL;DR) override it.
  description: content.profile.headline,
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
