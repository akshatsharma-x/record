<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CLASSYFOLIO rules

- Read DESIGN.md first. It's the source of truth. When a decision changes it, update DESIGN.md in the same commit and log the reason in §12.
- Every fact comes from `content/data.ts`, validated by `content/schema.ts`. A gap is `null` with a `TODO(akshat)` comment. Components never render a null field or the word "TODO".
- Never write the phone number anywhere: code, content, tests, commits or build output. `tests/unit/privacy.test.ts` fails on phone-shaped numbers.
- `content/` and the `lib/` files it imports also run under plain Node (`content/check.ts`, the prebuild step). Keep their relative imports with explicit `.ts` extensions, use `import type` for types, and don't use path aliases or enums there.
- Cache Components is on. Anything that reads the current time renders after `await io()` inside a `<Suspense>` boundary.
- Dev-only routes are `page.dev.tsx` files; only `next dev` serves them.
- Build each part on its own branch. Merge to `main` only when `npm run check`, `npm run build` and `npm run test:e2e` pass.
