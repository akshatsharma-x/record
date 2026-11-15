import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite resolves the "@/*" path alias from tsconfig.json itself.
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    // Node by default. A DOM test opts in with `// @vitest-environment jsdom`.
    environment: "node",
  },
});
