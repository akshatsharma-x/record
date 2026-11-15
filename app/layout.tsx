import type { Metadata } from "next";
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
 * backdrop, the shared 3D stage, then the content.
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
        <StageProvider>
          <div className="content-layer">{children}</div>
        </StageProvider>
      </body>
    </html>
  );
}
