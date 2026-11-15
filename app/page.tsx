import { content } from "@/content";

/** Part 1 renders a plain page title only. The story (DESIGN.md §3.1) starts in Part 5. */
export default function Home() {
  return (
    <main>
      <h1>{content.profile.name}</h1>
    </main>
  );
}
