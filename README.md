# CLASSYFOLIO

The portfolio of Akshat Sharma. [DESIGN.md](DESIGN.md) is the source of truth for every decision; [prompts.md](prompts.md) holds the build, one part at a time.

## Run it

```bash
npm install
npm run dev        # then open /dev/content to proofread the content
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | The dev server (Turbopack). |
| `npm run build` | Checks content, builds for production, then scans the output for phone-shaped numbers. |
| `npm run start` | Serves the production build. |
| `npm run check` | Typecheck, lint and unit tests. |
| `npm run test:e2e` | Builds, serves on port 3100 and runs Playwright in Safari (desktop and iPhone) and Chrome. |
| `npm run analyze` | Opens the Turbopack bundle analyzer. |

## Where things live

- `content/` holds every fact (`data.ts`), its zod schema (`schema.ts`), everything derived from it (`derive.ts`) and the build-time check (`check.ts`).
- `app/` holds the routes. `app/dev/**/page.dev.tsx` pages exist only under `next dev`; production returns 404 for them.
- `components/`, `lib/`, `styles/` and `public/` hold the UI, shared helpers, global CSS and static files.
- `tests/unit/` runs on Vitest, and `tests/e2e/` on Playwright.

## Rules

- Every fact comes from `content/`. A gap is `null` with a `TODO(akshat)` comment, and production never shows it.
- The phone number is never written anywhere: not in content, code, tests, commits or the build. The privacy test fails on anything shaped like one.
- Each part is built on its own branch and merged to `main` once `check`, `build` and `test:e2e` pass.
