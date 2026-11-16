import type { Metadata } from "next";
import { Cursor } from "@/components/cursor/cursor";
import { Island } from "@/components/island/island";
import { PageModes } from "@/components/page-modes/page-modes";
import { ResumeEdition } from "@/components/print/resume-edition";
import { Search } from "@/components/search/search";
import { SurfaceController } from "@/components/surface/surface-controller";
import { PreferencesSync } from "@/components/theme/preferences-sync";
import { StageProvider } from "@/components/three/stage";
import { content } from "@/content";
import { fontVariables } from "@/lib/fonts";
import { DEFAULT_FINISH, PREFERENCES_SCRIPT } from "@/lib/preferences";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: content.profile.name,
};

/**
 * The document. The head script applies the saved theme and finish before the first
 * paint (lib/preferences.ts), so <html> carries attributes React didn't render:
 * suppressHydrationWarning accepts them. Layers, bottom to top (§4.9): the surface
 * backdrop, the shared 3D stage, the content, then the Island (§6.2). Search (§6.3) and the
 * cursor (§6.1) live in the top layer. The résumé edition is what prints.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
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
        <PageModes />
        <Search />
        <ResumeEdition />
        <Cursor />
      </body>
    </html>
  );
}
