import { vi } from "vitest";

// A project's screenshot resolves from a blur placeholder made at build, in an async Server
// Component (components/work/shot.tsx). A unit test renders synchronously, so it draws the
// picture alone.
vi.mock("@/components/work/shot", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  Shot: ({ screenshot }: { screenshot: { src: string; alt: string } }) => <img className="work-shot" src={screenshot.src} alt={screenshot.alt} />,
}));
