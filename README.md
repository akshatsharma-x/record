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
| `npm run build` | Checks content, builds for production, writes each page's script policy, then scans the output for phone-shaped numbers. |
| `npm run start` | Serves the production build. |
| `npm run check` | Typecheck, lint and unit tests. |
| `npm run test:e2e` | Builds, serves on port 3100 (or `E2E_PORT`, where another app holds it) and runs Playwright in Safari (desktop and iPhone) and Chrome. |
| `npm run size` | After a build: holds every route's first-load JavaScript to the 170 KB budget (size-limit). |
| `npm run lighthouse` | Lighthouse CI on the home page, a case study and a paper, on port 3240, held to DESIGN.md §10. |
| `npm run measure` | Lighthouse CI, then writes its numbers into `content/measured.ts` for /colophon. |
| `npm run scan-history` | Scans every version of every file, and every commit message, for phone-shaped numbers. |
| `npm run analyze` | Opens the Turbopack bundle analyzer. |

GitHub Actions runs the checks, the history scan, the end-to-end tests, size-limit and Lighthouse CI on every pull request and on `main` (`.github/workflows/ci.yml`).

## Where things live

- `content/` holds every fact (`data.ts`), its zod schema (`schema.ts`), everything derived from it (`derive.ts`) and the build-time check (`check.ts`).
- `app/` holds the routes. `app/dev/**/page.dev.tsx` pages exist only under `next dev`; production returns 404 for them.
- `components/`, `lib/`, `styles/` and `public/` hold the UI, shared helpers, global CSS and static files.
- `tests/unit/` runs on Vitest, and `tests/e2e/` on Playwright.

## Rules

- Every fact comes from `content/`. A gap is `null` with a `TODO(akshat)` comment, and production never shows it.
- The phone number is never written anywhere: not in content, code, tests, commits or the build. The privacy test fails on anything shaped like one, and `npm run scan-history` checks the whole history before anything is pushed.
- Each part is built on its own branch and merged to `main` once `check`, `build` and `test:e2e` pass.
