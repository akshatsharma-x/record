import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { io } from "next/cache";
import { Suspense } from "react";
import { ContentReport } from "@/components/dev/content-report";
import { content } from "@/content";
import { derive } from "@/content/derive";
import { todoComments } from "@/content/todos";

/**
 * Dev only. The `.dev.tsx` extension keeps this route out of production builds, where
 * /dev/content returns 404 (see next.config.ts). It's the page Akshat proofreads.
 */
export const metadata: Metadata = {
  title: "Content · dev",
  robots: { index: false, follow: false },
};

export default function DevContentPage() {
  return (
    <Suspense fallback={<p className="p-6">Reading content…</p>}>
      <Report />
    </Suspense>
  );
}

async function Report() {
  // Derived values depend on today, so they're computed per request, not prerendered.
  await io();
  const source = await readFile(path.join(process.cwd(), "content", "data.ts"), "utf8");
  return <ContentReport content={content} derived={derive(content, new Date())} todos={todoComments(source)} />;
}
