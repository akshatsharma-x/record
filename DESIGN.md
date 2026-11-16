# CLASSYFOLIO design

The portfolio of Akshat Sharma: AI & ML engineer, B.Tech CSE '27 at Manipal University Jaipur, and currently an AI & ML Intern (Generative AI) at United Airlines.

**The bar:** an Apple design lead opens the site in Safari and wants to interview Akshat.

**How this document works.** DESIGN.md is the source of truth for every part. When a later decision changes it, update DESIGN.md in the same commit and add the reason to [§12](#12-decision-log). Rules that contradict each other as written are listed, unresolved, under [Open conflicts](#open-conflicts).

## Contents

1. [North star](#1-north-star): [Concept](#11-concept) · [Three words](#12-three-words) · [Audience](#13-audience) · [The 30-second path](#14-the-30-second-path) · [Apple-grade, not Apple-cloned](#15-apple-grade-not-apple-cloned)
2. [Global rules](#2-global-rules)
3. [Information architecture](#3-information-architecture): [Home](#31-home) · [Routes](#32-routes) · [Island nav](#33-island-nav)
4. [Tokens](#4-tokens): [Neutrals](#41-neutrals) · [Surfaces](#42-surfaces) · [Finishes](#43-finishes) · [Type](#44-type) · [Space and layout](#45-space-and-layout) · [Radii](#46-radii) · [Materials](#47-materials) · [Elevation](#48-elevation) · [Layers](#49-layers) · [Icons](#410-icons)
5. [Motion](#5-motion): [Curves](#51-curves) · [Springs](#52-springs) · [Durations](#53-durations) · [The Resolve](#54-the-resolve) · [Scroll scenes](#55-scroll-scenes) · [Motion on intent](#56-motion-on-intent) · [Reduced motion edition](#57-reduced-motion-edition)
6. [Interaction](#6-interaction): [The cursor](#61-the-cursor) · [The Island](#62-the-island) · [Search](#63-search) · [Focus ring](#64-focus-ring) · [Pressed state](#65-pressed-state) · [Depth on hover](#66-depth-on-hover)
7. [Signature moments](#7-signature-moments): [The hero](#71-the-hero) · [The statement and About](#72-the-statement-and-about) · [The highlights](#73-the-highlights)
8. [Surprises](#8-surprises)
9. [Voice](#9-voice)
10. [Budgets](#10-budgets)
11. [Stack](#11-stack)
12. [Decision log](#12-decision-log)

- [Open conflicts](#open-conflicts): [C1](#c1-hover-only-delights) · [C5](#c5-sentence-case). C2, C4, C6 and C7 were resolved in Part 2, and C3 in Part 4 (§12).

---

## 1. North star

### 1.1 Concept

**"Clarity, engineered."** Akshat's work has one through-line: making complex intelligent systems clear.

- Cartographer turns codebases into documentation and a knowledge graph.
- The papers make ML predictions explainable.
- The resume-screening project ships an XAI dashboard.
- The WCAG analyzer makes the web clear for everyone.

Clarity is also the first principle of Apple's Human Interface Guidelines. The site performs the concept: content arrives out of focus and resolves, and complexity turns into order when you interact with it.

### 1.2 Three words

Three words judge every decision: **clear, alive, crafted.**

### 1.3 Audience

Apple design and engineering recruiters, hiring managers and designers, mostly on a Mac or iPhone in Safari. They give the site 30 seconds before deciding whether to give it 5 minutes.

### 1.4 The 30-second path

- **The first screen** shows the name, the role, where Akshat works now, one line about who Akshat is, a way to see the work and a way to say hello.
- **Within one scroll,** the visitor sees the proof: numbers with sources.

### 1.5 Apple-grade, not Apple-cloned

- Use Apple's principles (clarity, deference, depth), rhythm and craft, never its assets: no Apple logos, product imagery, SF font files, SF Symbols or copied marketing lines.
- Borrow a pattern (a living status pill, a search palette, a Portrait-mode hero, a dock) only where it does a real job, and give each one a personal twist.
- In the UI, borrowed patterns get plain names, like "Search", never "Spotlight" or "Dynamic Island".

---

## 2. Global rules

These apply to every part.

1. **Truth.** Every fact and number comes from `content/`. Nothing is invented to look complete. A gap is marked `TODO(akshat)` in content, hidden in production (never shown as a placeholder) and listed on /dev/content.
2. **Privacy.** Never publish the phone number, even though every résumé carries it. It stays out of the HTML, the JSON-LD, the print edition, vCards and the git history. No résumé download until a phone-free PDF exists. No cookies; cookieless analytics only.
3. **The cursor is always locatable** (§6.1, built in Part 3). No feature may hide, cover, lag or shrink the hotspot below its spec.
4. **Motion has meaning.** Every animation explains a relationship, confirms an action or rewards intent. Loops run only inside media the visitor can pause, the periphery stays still, and everything has a reduced-motion edition (§5.7).
5. **Respect the visitor.** Native scrolling, with no hijacking and no smooth-scroll library. No preloader or intro gate, no modal on load, no autoplaying sound, and no content that only hover reveals. *Open conflict: [C1](#c1-hover-only-delights).*
6. **Performance is design** (§10). Animation is frame-rate independent: it's driven by time or by scroll position, never by frame count, so 60 Hz and 120 Hz ProMotion screens look identical. Animate transform and opacity; filter only sparingly.
7. **Accessibility is design** (§10). WCAG 2.2 AA, targets of at least 44×44 pt, a full keyboard path and VoiceOver testing. Single-key shortcuts can be turned off (§6.3). *Open conflict: [C1](#c1-hover-only-delights).*
8. **Safari first.** Test macOS Safari and iOS Safari, then Chrome, then Firefox.
9. **Tokens only.** Components contain no magic numbers: color, type, spacing, radius, duration and spring all come from tokens.
10. **Every state is designed:** default, hover, focus-visible, pressed, disabled, loading, empty, error and success.
11. **Each part ends green.** Typecheck, lint, unit and e2e tests, and a production build all pass. Then write a short report: what was built, screenshots (light and dark themes at 1440 and 390 px wide) and the open `TODO(akshat)` items.

---

## 3. Information architecture

### 3.1 Home

One long story, in this order. Surfaces are given for the light theme.

| # | Section | id | Surface |
|---:|---|---|---|
| 1 | Hero | `#top` | dark |
| 2 | Statement → About + At a glance | `#statement` → `#about` | dark → light |
| 3 | Highlights reel | `#highlights` | light-alt |
| 4 | Experience | `#experience` | light |
| 5 | Research & Publications | `#research` | dark (the lights go down) |
| 6 | Work | `#work` | light-alt (the lights come up) |
| 7 | Skills | `#skills` | dark |
| 8 | Credentials & honors | `#credentials` | dark |
| 9 | Contact | `#contact` | light |
| 10 | Footer | none | light-alt |

Credentials & honors holds education, certificates and achievements. It comes right after Skills and right before Contact.

Part 4 laid every section down with its id, surface and real copy, plainly set, so the Island and Search have somewhere to go. Each later part turns its section into its signature moment (§7). The statement is About's opening scene: its own dark section (`#statement`, `data-section-for="about"`), which the Island names About. Links to `#about` land past its pin (§5.5).

*Open conflict: [C5](#c5-sentence-case) (section name).*

### 3.2 Routes

| Route | What it is |
|---|---|
| `/` | The story. |
| `/work/[slug]` | A case study. It also opens over the home page as an expanding card. |
| `/research/[slug]` | A paper page. |
| `/specs` | The full "Tech Specs" page. |
| `/compare` | A hidden easter egg. |
| `/colophon` | How the site is built. |
| 404 | The page is "out of focus". |
| `/dev/kitchen`, `/dev/content` | Dev-only; return 404 in production. |

*Open conflict: [C5](#c5-sentence-case) ("Tech Specs").*

### 3.3 Island nav

Overview · Experience · Research · Work · Skills · Credentials · Contact

---

## 4. Tokens

### 4.1 Neutrals

Apple-calibrated, our own tokens.

| Token | Light | Dark |
|---|---|---|
| bg | #FFFFFF | #000000 |
| bg-alt | #F5F5F7 | #0E0E10 |
| fg | #1D1D1F | #F5F5F7 |
| fg-2 | #6E6E73 | #A1A1A6 |
| fg-3 | #86868B: large text (24 px and up) and decoration only, because it fails AA at small sizes | #86868B |
| hairline | rgb(0 0 0/.08) | rgb(255 255 255/.12) |
| card | #FFFFFF, on bg-alt | #1C1C1E |

### 4.2 Surfaces

- Every section sets `data-surface="light|light-alt|dark"`. Text tokens re-map per surface.
- The page background crossfades between surfaces, scrubbed by scroll, so the lights go down and come up.
- The crossfade runs over the last 20% of each section, and text tokens switch at its midpoint.
- In the dark theme, both light surfaces (light and light-alt) become bg-alt, so the rhythm between light and dark survives.
- In the light theme, cards invert against their surface: #FFFFFF on light-alt (§4.1), bg-alt on light.

### 4.3 Finishes

Finishes are the accent a visitor can choose, like a product's colors.

- Each finish has an accent-on-light and an accent-on-dark. Both must reach at least 4.5:1 for text, and a unit test checks this. If a hex fails, adjust the hex, never the rule.
- The finish also tints 3D materials, gradients, focus rings, selection and the Island's activities.
- Accent fills, such as primary buttons, use the on-light accent in both tones, so their labels are always white.
- Gradients run from the accent to a second stop of the same luminance, so they pass the accent's contrast test.
- The finish persists in localStorage.

| Finish | On light | On dark | Note |
|---|---|---|---|
| Contrail (default) | #0066CC | #2997FF | A sky blue that nods to United |
| Pink City | #C2416B | #FF7AA2 | Jaipur rose |
| Saffron | #AB5A00 | #FFB340 | |
| Monsoon | #00796B | #4FD1C5 | Teal |

### 4.4 Type

**Families**

- **Sans:** `-apple-system, BlinkMacSystemFont, var(--font-inter), system-ui, sans-serif`. On Apple devices this renders SF Pro, the visitor's own system font and therefore legal to use. Elsewhere it renders Inter Variable (v4, with the opsz axis), loaded with `preload: false` so Apple devices never download it.
- **Serif** (editorial accents, research titles, pull quotes): `ui-serif`, which is New York in Safari, then Newsreader (variable, with italics).
- **Mono** (metrics, IDs, code): `ui-monospace`, which is SF Mono, then JetBrains Mono.

**Scale.** Sizes clamp from desktop down to phone. A dash means not specified.

| Style | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| hero | 168 → 56 | 0.95 | -0.035em | 700 |
| display | 80 → 40 | 1.05 | -0.025em | 600 |
| title | 48 → 28 | 1.1 | -0.02em | 600 |
| eyebrow | 21 → 17 | 1.2 | -0.01em | 600 |
| lead | 24 → 19 | 1.4 | -0.01em | 400 |
| body | 17 | 1.47 | -0.022em | 400 |
| caption | 14 → 12 | 1.33 | — | — |
| footnote | 12 | 1.33 | — | — |

**Rules**

- Headlines use `text-wrap: balance`; paragraphs use `text-wrap: pretty`.
- Set `hanging-punctuation: first` (Safari).
- Every number that animates uses `tabular-nums`.
- Sentence case everywhere. *Open conflict: [C5](#c5-sentence-case).*
- At most one gradient-filled word per section.

### 4.5 Space and layout

- **Grid:** 8 pt, with 4 pt half-steps for type, icons and the layout values that need them (the 20px medium gutter and the 180px padding cap).
- **Section block padding:** `clamp(96px, 12vw, 180px)`.
- **Widths:** measure 680px · content 1024px · wide 1440px.
- **Breakpoints** (Apple's own web breakpoints), with grid columns and gutter:

| Breakpoint | Viewport | Columns / gutter |
|---|---|---|
| small | ≤ 734 | 4 / 16px |
| medium | 735–1068 | 8 / 20px |
| large | 1069–1440 | 12 / 24px |
| xlarge | > 1440 | not specified |

- **Bento grids:** 12 columns, with tiles spanning 4, 6, 8 or 12 at fixed aspect ratios.

### 4.6 Radii

| chip | control | card-s | card-l | pill |
|---:|---:|---:|---:|---:|
| 8 | 12 | 18 | 28 | 999 |

Add `corner-shape: squircle` inside `@supports` for continuous corners, and re-tune those radii so the fallback looks the same: 1.84× (chip 14.75 · control 22 · card-s 33 · card-l 51.5) cuts each corner by the same amount. Capsules (pill) keep round ends.

### 4.7 Materials

Inspired by Liquid Glass.

- **Glass:** light `rgb(255 255 255/.72)`, dark `rgb(28 28 30/.72)`, with `backdrop-filter: saturate(180%) blur(20px)` plus the `-webkit-` prefix, a 1px inner specular rim (light on top, shade at the bottom) and no heavy shadows.
- **Fallback:** solid materials under `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors`.

### 4.8 Elevation

Soft and rare: `0 2px 8px rgb(0 0 0/.04), 0 12px 40px rgb(0 0 0/.08)`.

### 4.9 Layers

Bottom to top:

1. The page background: the surface backdrop that crossfades between sections (§4.2)
2. The shared 3D canvas
3. Content, including section text
4. Sticky elements
5. The Island
6. Overlays (`<dialog>` in the top layer)
7. The cursor: a popover in the top layer that re-stacks itself above dialogs and other popovers (§6.1)

Anything above the canvas is transparent where a scene shows through it.

### 4.10 Icons

- Lucide at a 1.5px stroke, which sits well next to SF.
- Tech logos come from Simple Icons (CC0), in monochrome.

---

## 5. Motion

### 5.1 Curves

| Name | Value |
|---|---|
| ease-out | `cubic-bezier(.22,1,.36,1)` |
| ease-in-out | `cubic-bezier(.65,0,.35,1)` |
| emphasized | `cubic-bezier(.2,0,0,1)` |

### 5.2 Springs

SwiftUI-style, expressed as Motion `{ visualDuration, bounce }`.

| Name | visualDuration | bounce |
|---|---:|---:|
| smooth | .5 | 0 |
| snappy | .35 | .15 |
| bouncy | .5 | .3 |
| island | .45 | .25 |

### 5.3 Durations

| Name | Value |
|---|---|
| micro | 150–200ms |
| UI | 300–400ms |
| reveals | 600–900ms |
| cinematic scenes | scroll-scrubbed |

### 5.4 The Resolve

The signature entrance.

- Opacity 0 → 1, blur 12px → 0, y 16px → 0 and scale .98 → 1, over 700ms with ease-out; lines staggered 60ms.
- Headlines rise line by line through a mask, and images resolve from their blur placeholders.
- Never animate blur on full-screen layers on phones.

### 5.5 Scroll scenes

- GSAP ScrollTrigger: scrub ≈ .6 (it softens mouse wheels), `ignoreMobileResize` and svh units.
- A pinned scene is at most 300vh and can be skipped with the keyboard and the Island.

### 5.6 Motion on intent

A tile animates on hover or focus, or once on its first reveal, and then rests.

### 5.7 Reduced motion edition

- No pinning, scrubbing, parallax or blur.
- Reveals become 200ms fades.
- Every scene shows its final readable state.
- 3D shows a still.

---

## 6. Interaction

### 6.1 The cursor

Whatever the cursor is doing, the visitor can always find it (§2 rule 3). Built in Part 3: the engine is `lib/cursor/`, and `components/cursor/` mounts it.

**Anatomy**

- **The dot** is the hotspot: a 14px circle in an ink that suits what's under it (near-black over light, near-white over dark) at 90% opacity, with a 1.5px outline in the other ink and a faint shadow. One of the two inks always contrasts, so the dot shows on white, black, mid-gray, every accent, photos, video, WebGL and the Island. It never uses `mix-blend-mode: difference`, which vanishes on mid-gray.
- **The shape** is the morphing companion. It's hidden until a magnetic target, media or a drag area calls for it.
- **Zero lag.** The pointermove handler writes the dot's transform (`translate3d`, with `will-change: transform`), so one frame later the hotspot is within 0.5px of the pointer. Only the shape uses springs.

**States** come from `data-cursor` attributes and element roles, recomputed on pointermove and on scroll, because scrolling changes what sits under a still pointer. Native zones win outright; otherwise the closest match up the tree wins, so a button inside a drag area is still a button.

| State | When | What the visitor sees |
|---|---|---|
| Default | Anywhere else | The 14px dot |
| Magnetic | Links, buttons, labelled controls and their roles; `data-cursor="magnetic"` | The target's rounded rect plus 8px, tinted with its accent at 12%, on the snappy spring. The target drifts up to 4px toward the pointer and its label up to 2px. The dot shrinks to 6px. Targets larger than 480×160 keep the plain dot |
| Text | Over glyphs; `data-cursor="text"` | A 2px I-beam as tall as the line |
| Media or card | `data-cursor="open"`, `"play"` or `"view"`; `data-cursor-label` replaces the word | A 72px glass circle carrying the label, with the 6px dot at its center |
| Drag | `data-cursor="drag"` (the reel, the timeline, medals, 3D) and range inputs | A 64px glass circle with ‹ › and the 6px dot |
| Loupe | `data-cursor="loupe"`: the typographic hero's name | A 120px liquid-glass lens that magnifies the letters under it 1.35×: a scaled copy of the target, clipped to the lens, with a specular rim and a faint chromatic edge. The 14px dot stays at its center with a 2px outline. The copy is `aria-hidden`, and nothing requires the lens |
| Disabled | `:disabled`, `aria-disabled="true"` | A ring with a 45° slash, and the 14px dot |
| Navigating | A route change that takes longer than 120ms, or `html[data-cursor-busy]` while an overlay loads | The ring draws as a spinner arc |
| Pressed | Pointer down | The shape scales to .9 and the dot to .8, then both spring back |
| Native | Text inputs, textareas, selects, iframes, `video[controls]`, contenteditable, `data-cursor="native"` | The system cursor: the native I-beam for typing |

**Ink.** The engine reads what's painted under the hotspot, top layer first: a `data-cursor-ink="light"` or `"dark"` declaration; the pixels of an image, a video or a 2D canvas; the nearest background color, faded by its opacity and blended over whatever is behind it; and finally the section's surface. Imagery whose pixels can't be read, such as WebGL or cross-origin images, declares its ink: `<StageView ink="light">` for a mostly dark scene.

**Locatability**

- **Shake to locate,** as on macOS: at least 4 fast horizontal direction reversals within 600ms grow the dot to 3× for 700ms, then it springs back.
- **Idle locator:** after 3s of stillness with the pointer inside the window, one soft ring pulses from the dot, once per rest.
- **Re-entry:** the cursor appears at once where the pointer enters, never flying in from 0,0. Leaving the window fades it out over 150ms.
- **Settings:** "Larger cursor" (1.5×) and "Use system cursor", in Search and the footer, persisted in localStorage. `components/cursor/cursor-settings.tsx` is ready for both; the kitchen shows it until they exist.

**Always on top.** The root is a `popover="manual"` element in the top layer. Whenever a modal `<dialog>`, another popover or fullscreen opens, it re-stacks itself with `hidePopover()` then `showPopover()`. If the browser refuses, it moves into the topmost open dialog. During a View Transition it takes the name `cursor`, with its old snapshot hidden and its group animation off, so it stays live above the snapshots. Start every View Transition with `startViewTransition()` from `lib/view-transition.ts`, which marks `html[data-view-transition]` for its length.

**Guarantees.** The native cursor comes back by itself:

- for touch and pen: the custom cursor runs only under `(hover: hover) and (pointer: fine)`, and a touch or pen event hands over at once;
- until the first pointermove gives a real position; `html.cursor-custom` then hides the native cursor in the same frame the dot appears;
- over native zones (CSS exempts them from `cursor: none`), in forced-colors mode and during native drag and drop;
- through a watchdog: if the cursor loop throws, or goes 500ms without a frame while the pointer moves, `html.cursor-custom` comes off and the failure is logged once.

**Preferences.** With reduced motion there are no springs and no drift, and shape changes are instant. Shake to locate still works, because it changes size, not position; the idle ring fades in place instead of growing. With `prefers-contrast: more`, the outline is 2px, the inks are opaque and the magnetic tint becomes a solid ring.

### 6.2 The Island

A living black pill at the top. It is the nav, the section indicator, the scroll progress and the place where every confirmation appears. Built in Part 4: `components/island/`, with its state in `lib/island/store.ts`.

- **Shape.** Black in both themes, with a hairline at rgb(255 255 255 / .14) so it reads against black, 12px below the safe area at the top center. Collapsed, it's 36px tall (a 44px target) and holds the "AS" monogram, the current section's name and a 14px scroll-progress ring. Its width hugs the content. When the section changes, the name swaps with a 180ms blur-crossfade while the width springs on the island spring, so the pill seems to breathe.
- **Expanded** on hover (after a 120ms intent delay), click, tap or keyboard focus. It springs into a rounded rect holding the seven section links (the current one marked), Search ⌘K, the theme toggle and an accent "Say hello" pill. Escape collapses it, and so do a click outside, focus leaving and the pointer leaving after a 300ms grace period. On phones, a tap opens a full-width sheet of 44pt rows over a dimmed page.
- **Activities.** Other parts confirm things with `island.show({ icon, title, detail?, tone })`, where the tone is neutral, accent, success or error. The pill grows into a wider capsule for 2.2s, then returns. Activities that fire rapidly queue, and each gets its full time. The same message twice in a row extends the one showing instead of repeating, and while the Island is expanded the queue waits. Each one is announced through a visually hidden role="status".
- **Semantics.** A `<nav aria-label="Primary">` with a disclosure button (aria-expanded, aria-controls). The links are real anchors to `/#id`, so they work without JavaScript; without it, the Island renders open at the top of the page and scrolls away. On the home page, a link travels to its section smoothly (instantly with reduced motion), updates the URL and moves focus to the section's heading. The current section's link has aria-current="true". Overview is the hero (`#top`) and stays current through About and Highlights. `scroll-padding-top` keeps every heading clear of the pill.
- **Reduced motion:** the shell changes size at once, and the name crossfades without blur.

### 6.3 Search

Search everything, jump anywhere and run actions. Built in Part 4: `components/search/`, with matching in `lib/search/`.

- **Opening.** ⌘K or Ctrl K, anywhere, even while typing; "/"; or the Island's Search button. Search is a centered glass panel in a top-layer `<dialog>`, 640px wide, with a 24px field. Its glass is denser than the generic material (96% in light, 86% in dark), so secondary text clears 4.5:1 over any page. The field is always focused while Search is open, so the focus ring frames the panel.
- **Results** are grouped as Top hit, Sections, Work (roles and projects), Research, Skills, Credentials (education, honors and certificates) and Actions. With nothing typed, it suggests the seven sections and the actions. Results resolve in 40ms apart, and the selection highlight slides between rows on the snappy spring.
- **The index** is built from the content at build time (`content/derive.ts`) and served as `/search-index.json`, fetched the moment a visitor shows intent. Pages that don't exist yet link to their home section.
- **Matching** is fuzzy. Every typed word must match the title, keywords, subtitle or body: exactly, as a prefix, inside a longer word (four letters or more), typed together along word boundaries ("nextjs") or with a typo (one edit from four letters, two from eight; a transposition counts as one). Skill aliases and a small vocabulary (`lib/search/vocabulary.ts`) let a word find what it means: "rag" finds Cognivault AI and United Airlines, and "llm" finds Cartographer.
- **Keyboard.** ↑ and ↓ move, Enter opens, ⌘Enter or Ctrl Enter opens in a new tab, and Esc closes. The field is a combobox that drives a grouped listbox through aria-activedescendant, so focus stays in the field. The page behind is inert, focus returns where it was, and a live region announces the count.
- **Arithmetic.** A small parser works out typed sums, never eval: "12*7" shows 84, and Enter copies it.
- **Actions** (Part 13 adds more): Copy email, Open LinkedIn, Open GitHub, Toggle theme, Change finish (or a finish by name), Larger cursor, Use system cursor, Show grid (G), Focus mode (F), Print the résumé edition and Single-key shortcuts. Each confirms itself through the Island.
  - **Show grid** lays the grid's columns over the page at the content width.
  - **Focus mode** keeps the section being read lit and dims the rest of the page. F or Esc turns it off.
  - **Print the résumé edition** prints a résumé typeset from the content, with no phone number. Printing any page prints it.
- **Single-key shortcuts** ("/", G and F) never fire while typing, with a modifier or behind a modal dialog. Search can turn them off, and the choice persists, as WCAG 2.1.4 requires.

### 6.4 Focus ring

A 3px accent ring at a 2px offset that follows the element's radius. It shows on every keyboard focus and is never removed.

### 6.5 Pressed state

Scale to .97 on the snappy spring, with a slight overshoot on release.

### 6.6 Depth on hover

Cards tilt with tvOS-style parallax (at most 6°) under a moving specular highlight. Off for reduced motion and touch.

---

## 7. Signature moments

One per section; details in their parts.

| Section | Moment | Part |
|---|---|---:|
| Hero | Portrait mode | 5 |
| Statement | Word fill, plus the At-a-glance bento | 6 |
| Highlights | The reel | 6 |
| Experience | "The edit", a multi-track career timeline | 7 |
| Research | The lights go down, then the living abstracts | 8 |
| Work | A bento grid whose tiles expand into case-study cards | 9 |
| Skills | "The chip", an exploded 3D view | 10 |
| Credentials | The wallet and the medals | 11 |
| Contact | The dock and the composer | 12 |

### 7.1 The hero

Built in Part 5 (`components/hero/`, logic in `lib/hero.ts`). Two editions, one content: the portrait edition switches on by itself when `profile.photo` exists; until then the typographic edition ships. Both read in full without JavaScript and with reduced motion.

**Shared content.** A Lock Screen date line: the visitor's date in their locale, then Akshat's live time and place ("Monday, 16 November · 9:41 PM IST", "in Jaipur" once the city is confirmed). Then the name, the role, the headline, three derived chips (Now at United Airlines · B.Tech CSE ’27 · Manipal University Jaipur · SCI-2026 · Springer LNNS), the "See my work" pill (#work) and "Say hello ›" (#contact). Then the finish swatches, each named like a product color: choosing one wipes the new finish out from the swatch over 600ms and says so in the Island. A home-indicator bar breathes every 4s until the first scroll, then never again. A pause button stops the loops (WCAG 2.2.2).

**Arrival.** CSS from the first paint, over within 1.2s, with no gate: the name comes into focus line by line (blur and rise, never transparent, so it's the LCP at once), the details fade after it and the UI last.

**Typographic edition.** The name huge and centered on the dark surface, on two lines on phones, over a light field: three soft discs in the finish's two hues and the hour's warmth (dawn, noon, dusk, night), drifting on a 20s loop that rests off-screen, in a hidden tab and when paused. The loupe (§6.1) magnifies the name.

**Portrait edition.** Layers, back to front: the background plate (blurred like bokeh, and past its 3:4 frame a heavier blur of itself), the name in white, Akshat cut out, then the UI. The arrival is a focus pull: pre-blurred copies of the plate (24px) and the subject (12px) fade off the settled ones (8px and sharp), so no blur animates on a full-screen layer (§5.4). The pointer moves the layers in depth on the smooth spring (plate ±8px, name ±4px, subject ±12px); on phones a tilt does, where it needs no permission. Scrolling away, the subject scales to .92 and rises slower than the name, which fades upward as the light dims. The ƒ button opens the aperture dial, ƒ1.4 to ƒ16 in full stops, which sets the plate's blur live (24px to 2px; ƒ4 is 8px) for the session. On phones the first screen is the Lock Screen (the date, the name behind the head, the role and headline); the chips, links and finishes follow on the dark floor. The photo's `headTop` places the name and the phone frame, so the head covers only the foot of the letters.

### 7.2 The statement and About

Built in Part 6 (`components/about/`, logic in `lib/statement.ts` and `lib/glance.ts`).

**The statement.** `content.copy.statement` at display size, centered in the measure, pinned on the dark surface for 160svh. As the visitor scrolls, each word fills from fg-3 to fg in reading order, a few words soft at the front: one number, `--fill`, follows the scroll exactly and CSS turns it into every word's color. "the clear kind" (`copy.statement.emphasis`) is the section's one gradient phrase; its fg-3 ink clears to show the gradient. The fill takes the first 80% of the pin, then the full statement holds and the lights come up into About. It's real text: without JavaScript, and with reduced motion, it reads fully filled with no pin.

**About.** On a light surface: "Hi, I'm Akshat." and the bio on the left, ending on a quiet Currently line (building, researching, reading) that leaves out what's empty. On the right, At a glance: a 12-column bento whose rows are square, with tiles spanning 4, 8 or 12 (two to a row on phones). Each tile animates once on its first reveal, then rests.

| Tile | Shows | On click |
|---|---|---|
| Now | The current role and org, "since June 2026" and its length in months | |
| Studying | The degree and university, and a ring of progress to the graduation month | Flips to the days left |
| Research | The papers, counted, and their venue | |
| Experience | The internships, counted | |
| Work | The projects, counted | |
| Local time | Akshat's clock face and time, and working hours | Switches 12- and 24-hour time and shows the overlap with the visitor's day (`copy.about.visitorDay`) on a 24-hour track |

The static facts are in the HTML; what depends on today (the length, the progress, the clock and the overlap) fills in after hydration, in a tile whose size never changes.

### 7.3 The highlights

Built in Part 6 (`components/highlights/`, logic in `lib/reel.ts`). "The highlights." over a reel: a full-bleed, horizontal scroll-snap gallery of dark cards, 4:5 on phones and 16:10 from tablets up, one per `content.highlights` entry. Each card plays a micro-film of SVG and CSS, no video: two pulses fan out into six documents; a cost counter settles at $0.08–0.11 while a token bar compresses 22–25%; two sheets settle under SCI-2026; an ROC curve draws to an AUC of 0.98; 300 dots condense to 50; a ring fills to 90%+; a week of bars rises to 2,500+. Each highlight's `film` says which, and the schema checks that every figure it draws is stated by the notes it cites; the films label figures in the footnotes' own words.

Only the card in view plays, while the reel is on screen and the tab is visible. One control at the bottom right pauses the whole reel for the session (WCAG 2.2.2), and the current card's dot stretches into a bar that fills with its film. Swipes and trackpads scroll it natively, a mouse drags it (the cursor shows its drag state), and the arrow keys, Home and End move between cards from the one tab stop. Each card's + opens a sheet with the full fact, its footnote and a link to its section. With reduced motion every card rests on its final frame.

---

## 8. Surprises

Catalog in Part 13.

- Every section hides one delight behind a click or a hover, and the site adds a few global ones.
- None of them blocks content, plays sound or repeats in an annoying way.

*Open conflict: [C1](#c1-hover-only-delights).*

---

## 9. Voice

- **Rhythm.** Apple rhythm: short declaratives; fragment, fragment, payoff. For example: "Six documents. Two calls. Pennies a run.¹" Numbers are the heroes. No buzzwords, no exclamation marks, and sentence case throughout. *Open conflict: [C5](#c5-sentence-case).*
- **Person.** First person ("I") in the About and Contact sections; product voice in headlines. Anywhere else that refers to Akshat in the third person, use the name, not pronouns (Akshat hasn't specified them).
- **Footnotes.** Every number gets a footnote: a superscript that links to the note in the footer, with a ↩ link back.
- **Approval.** Copy in content stays a draft until Akshat approves it.

---

## 10. Budgets

- **Web vitals:** LCP under 2.0s on a mid-range phone over 4G · INP under 150ms · CLS under 0.05. LCP is measured with Lighthouse's mobile profile under DevTools throttling (see §12, Part 5).
- **JavaScript:** first-load JS of at most 170 KB gzip. 3D and Ask load as lazy chunks.
- **Lighthouse:** performance at least 95; accessibility, best practices and SEO at 100.
- **3D:** only on capable devices (tier HIGH or MID), with posters everywhere else. The whole site uses one WebGL context, and nothing renders off-screen.
- **Accessibility:** WCAG 2.2 AA, with every contrast pair unit-tested. Anything that moves for longer than 5 seconds gets a pause control (WCAG 2.2.2). Every part gets a VoiceOver pass.

---

## 11. Stack

- Next.js (latest, App Router, Turbopack), React 19 and TypeScript in strict mode.
- Cache Components and Partial Prefetching are on. The static shell prerenders; anything that reads the current time renders after `io()` inside a Suspense boundary.
- Tailwind CSS v4 on CSS variables.
- GSAP 3 with ScrollTrigger and SplitText (all free now), through @gsap/react.
- Motion (motion/react) for layout, shared-element and spring UI.
- three, @react-three/fiber and @react-three/drei, with one Canvas and a drei `<View>` per scene.
- zustand for UI state; zod for content and forms.
- Resend and Upstash rate limiting for the contact form.
- Tests: Vitest, Playwright, axe-core and Lighthouse CI. Hosting: Vercel.
- Server Components by default; client components only for interactive islands. All content is server-rendered, so the site reads without JS.

---

## 12. Decision log

Append as you go, each with its reason.

- **No preloader.** The content is the intro, and the hero paints within the first second.
- **Native scroll.** Mac trackpad momentum is sacred, and Apple doesn't hijack it either.
- **The system font on Apple devices.** It's the most Apple-like typography that is legally ours to use.
- **No skill bars or percentages.** They measure confidence, not evidence, so the site shows where each skill was used instead.
- **The phone number is never published, and there's no résumé download until a phone-free PDF exists.** See §2 rule 2.
- **The certificates heading derives from data and never shows "0".**
- **A project's year and role stay hidden until Akshat confirms them.**
- **Cache Components and Partial Prefetching stay on** (Part 1). create-next-app 16.4 turns both on, and Next.js makes them the default everywhere in its next major. Pages get an instant static shell, and values that depend on today, such as role durations, graduation progress and live clocks, stream in after `io()`.
- **C2 resolved: animation is frame-rate independent** (Part 2). §2 rule 6 now says time or scroll position, never frame count. Its own reason was 60 Hz and 120 Hz parity, which scroll-driven animation already meets, and §4.2 and §5 require scrubbing.
- **C4 resolved: three surface values** (Part 2). data-surface takes light, light-alt or dark. In the dark theme both light surfaces become bg-alt: the rhythm between light and dark (the lights going down and up) matters more than light against light-alt, and separating them would have needed an invented color.
- **C6 resolved: 4 pt half-steps for layout too** (Part 2). The 20px medium gutter and the 180px padding cap are DESIGN.md's own numbers and Apple's measurements, so the grid rule makes room for them rather than changing them.
- **C7 resolved: the canvas sits between the page background and the content** (Part 2). The parenthetical was the intent, and the order now matches it. Sections are transparent while the surface controller runs, so the backdrop is the only background beneath the canvas.
- **Saffron on light is #AB5A00, not #B25E00** (Part 2). It measured 4.29:1 on bg-alt, and §4.3 says adjust the hex, never the rule. #AB5A00 is the smallest darkening that passes: 4.60:1 on bg-alt and 5.01:1 on white.
- **Accent fills use the on-light accent in both tones** (Part 2). A white label on Contrail's on-dark #2997FF measures 3.0:1; on the on-light accent it's at least 4.93:1 in every finish.
- **Gradient text ends on a luminance-matched second stop** (Part 2). Each finish's second stop is its accent rotated about 35° in OKLCH at the same WCAG luminance, so a gradient word passes exactly the accent's contrast.
- **Cards invert against light surfaces** (Part 2). §4.1 sets white cards on bg-alt; on a white surface a white card would vanish, so there it's bg-alt.
- **Capsules keep round ends** (Part 2). A squircle at full radius looks boxy, so pills opt out of corner-shape: squircle.
- **The cursor's visibility test counts pixels over the dot's own footprint** (Part 3). As written, at least 20% of the pixels in a 40px box must contrast 3:1 with the local background. But a 14px dot with its outline covers about 14% of that box, so no correct dot could pass. The test keeps the 40px box for the background median, taken from its outer ring, and counts contrasting pixels in the dot's 20px box. The real dot scores 35–46% on every background in both engines. With the wrong ink, only the outline contrasts and it scores 17%, so the test still fails a cursor that loses its fill. To be confirmed with Akshat.
- **The dot's ink follows what's painted under it, not just the section's tone** (Part 3). Going by tone alone, the dark fill sat on Contrail blue at 2.9:1, on disabled buttons faded to near-white, and on dark photos inside light sections, leaving only the 1.5px outline to contrast.
- **The cursor takes a view-transition-name only during transitions** (Part 3). A permanent name makes it a backdrop root, so the media circle's glass couldn't blur the page beneath it. lib/view-transition.ts marks html[data-view-transition] for the length of every transition, and theme switching goes through it.
- **No native-cursor fallback during View Transitions** (Part 3). The spec allowed one if Safari froze or ghosted the cursor mid-transition. The e2e test moves the pointer during a transition in WebKit and Chromium: the dot is live at the new position, with no ghost at the old one. If a future Safari regresses, drop html.cursor-custom while html[data-view-transition] is set.
- **Drift is net movement: the target moves up to 4px, its label up to 2px** (Part 3). The label lags its platter, so the words stay steady and readable while the highlight glides under them. Inline links don't drift at all: transforms don't apply to inline boxes, and moving words inside a paragraph would collide with their neighbors. They still get the shape, around the line under the pointer.
- **A Switch for on/off settings** (Part 3). The cursor settings are switches (components/ui/switch.tsx): real checkboxes with role="switch". The off track carries a fg-3 hairline, so the control's edge clears 3:1 on every surface, which iOS's gray track doesn't.
- **The home page's sections exist from Part 4** (Part 4). The Island's links and Search's results need real targets: a link can't work, with or without JavaScript, if nothing carries its id. Every section in §3.1 now renders with its id, surface and real copy (headlines, the bio, highlights, roles, papers, projects, skills, credentials and contact), with footnotes. Parts 5–12 replace each one.
- **Overview is the hero, and stays current through About and Highlights** (Part 4). lib/sections.ts had read it provisionally as `#top`. The Island names the section under the pointer line, About or Highlights included, but marks Overview in the nav, since those two have no link of their own.
- **C3 resolved: single-key shortcuts can be turned off** (Part 4). "/", G and F are all character-key shortcuts. They fire only outside text fields, without modifiers and outside modal dialogs, and Search's "Single-key shortcuts" action turns them off for good (localStorage). WCAG 2.1.4 accepts a way to turn them off. ⌘K and Ctrl K always work.
- **"rag" also finds work grounded on knowledge graphs** (Part 4). The brief asks for "rag" to find United Airlines, whose content never says RAG: Cartographer generates on top of a code knowledge graph, which is GraphRAG. Rather than add a claim to the content, the search vocabulary maps "rag" to "knowledge graphs". To be confirmed with Akshat.
- **Search has a Credentials group** (Part 4). The index has education, honors and certificates, and none of the six named groups fits them. Roles and projects share Work.
- **Search's glass is denser than the generic material** (Part 4). The 72% glass over a dimmed page drops fg-2 to about 4:1 where the page behind is dark. Search uses 96% in light and 86% in dark, tested over a dimmed black and a dimmed white page.
- **The focus ring frames the whole Search panel** (Part 4). Its field is always focused while Search is open, and a ring around the field alone read as a heavy box. The panel is one big field, so the §6.4 ring follows the panel's radius instead.
- **The page's background takes part in hit-testing, and the body paints the active surface** (Part 4). Tools that read colors from the elements under a point, axe among them, couldn't see the fixed backdrop, so dark sections' text measured against white. The backdrop sits beneath everything, so it never catches a click meant for the content. Under the surface controller, the body takes the active surface's color, which also fixes Safari's overscroll showing white above a dark hero.
- **The surface controller paints its first state in the same task** (Part 4). It used to make sections transparent and paint the backdrop a frame later. No frame ever showed the gap, but anything reading colors in between saw white behind light text.
- **The Island listens for hover natively** (Part 4). React derives pointer enter and leave from the element the pointer came from, and skips them while that part of the page is still hydrating: a hover in the first moments after load was lost.
- **Search links to home sections until the pages exist** (Part 4). Its index points at /work/[slug] and /research/[slug], which Parts 9 and 8 build. Until then those entries link to #work and #research, so no result leads to a 404.
- **Search's actions run inside the gesture** (Part 4). Safari lets the clipboard be written only during the click or key press itself. The dialog closes at once, so a theme reveal or a print still sees the page, and the action runs in the same handler.
- **The portrait edition is built against a stand-in** (Part 5). Until Akshat's photo exists, scripts/portrait-fixture.mjs draws a studio bust as two layers (a subject cutout and a plate) into public/_fixtures (not committed). /dev/hero shows it, and builds with `CLASSYFOLIO_PORTRAIT_FIXTURE=1` use it for Lighthouse. Production ships the typographic edition until `profile.photo` is set. The optional Depth Pro map is skipped: three layers carry the parallax.
- **The portrait says where the head sits** (Part 5). `photo.headTop`, as a share of the height, sets the name and, on phones, the frame, so the head covers only the foot of the letters whatever the framing. Without it, a two-line name on a phone sat almost wholly behind the head.
- **On phones the portrait spans two screens** (Part 5). Fitting the details into one screen put them over the face. The first screen is the Lock Screen: the date, the name behind the head, the role and the headline. The chips, links and finishes follow on the dark floor.
- **The date line renders in the browser** (Part 5). Only the browser knows the visitor's date and locale, so the server renders the place and zone ("India · IST", never a stale time) and the page stays static, with no `io()` in the shell. The live line arrives as a new element in a full-width box, so the swap shifts nothing.
- **The arrival is CSS from the first paint, and the name is never transparent** (Part 5). It only blurs and rises into place, so it paints, and counts as LCP, at once. The fades fill backwards: once over they leave no effect behind, so nothing stays a backdrop root and the dial's glass blurs what's behind it.
- **Hero text is white throughout** (Part 5). fg-2 and accent-colored text fail over the light field, so the role, the headline, the date line and "Say hello" are fg. The discs are radial gradients capped at 22%, which keeps fg at 4.5:1 or more where all three overlap, in every finish and at every hour (tests/unit/contrast.test.ts).
- **The portrait's scrims assume a white wall** (Part 5). The real plate's color is unknown, so the top third, which holds the date line and the name, is dimmed evenly by .58, and the floor reaches .72 where the details begin. Both pass AA for white text over pure white.
- **The aperture's stops** (Part 5). Full stops ƒ1.4, 2, 2.8, 4, 5.6, 8, 11, 16 give 24, 16, 12, 8, 6, 4, 3 and 2px of blur. ƒ4 is the 8px the focus pull settles on, and ƒ1.4 the 24px it starts from. The head script restores the session's stop before the first paint. The dial isn't a `<label>`, which would make its whole face a button to the cursor.
- **The aperture's ƒ is drawn, not typed** (Part 5). Set in the serif italic, that one glyph made Chrome download two font files (237 KB) before the first paint.
- **The plate loads at half resolution** (Part 5). It's always blurred, so it needs no more. It also stops the plate, which is the subject's size, from taking the LCP from the subject, which is preloaded with fetchpriority="high". Every hero image loads eagerly, since Next 16's Image defaults to lazy.
- **The finish wipe** (Part 5). A View Transition whose new snapshot shows through a circle with a 72px soft edge, grown from the swatch on the in-out curve over 600ms (`--wipe-r` is registered so it animates). On ease-out the circle covered most of the screen within a quarter of the time. The swatch's own selection changes at once; the color follows.
- **The scroll cue rests for good** (Part 5). The first scroll is remembered in localStorage, and the head script sets html[data-scrolled], so the cue never breathes on a return visit.
- **Button is server-safe** (Part 5). An inert link renders with no href and no handler, and a live one passes onClick only when given: Server Components can't pass functions to next/link. The link style draws its own ›, so the hero trims the one in `copy.hero.ctaHello`.
- **LCP is measured under DevTools throttling** (Part 5). On localhost, Lighthouse's simulated mode reports 2.7s for the typographic hero and 3.0s for the portrait, because it counts every request that finished before the first frame as a dependency of the paint: about 160 KB of async framework JavaScript, and the 129 KB serif face for the research titles below the fold. With the same mobile profile under real throttling (DevTools: 562ms request latency, 1.47 Mbps, 4× CPU), LCP equals FCP at 1.42s (typographic) and 1.49–1.58s (portrait, the subject), and CLS is 0. Performance scores 0.96 and 0.94 simulated, 1.0 with DevTools. Re-check with PageSpeed Insights once deployed. To be confirmed with Akshat. Follow-up: Chrome downloads the serif on every visit for the research titles; loading it as the section approaches would take it out of the first paint's window.
- **The statement is About's opening scene** (Part 6). It's a dark section of its own, `#statement` with `data-section-for="about"`, before About's light one, so the surface controller can crossfade between them. The controller reports it as About, so the Island names it About and keeps Overview current. Links and Search land on `#about`, past the pin, which is how §5.5 lets a pinned scene be skipped; the keyboard skips it too, since it holds nothing focusable.
- **The statement's fill maps the scroll exactly, with no scrub** (Part 6). §5.5's .6 scrub softens mouse wheels, but trackpads and touch already scroll smoothly, and smoothing made the words trail the page; the brief asks for exact tracking. The e2e test scrolls through the pin a frame at a time in WebKit and finds the fill on the scroll position in every frame.
- **The statement's size is capped by the stage** (Part 6). At display size in the 680px measure it ran ten lines and overflowed a 900px screen, hiding its end for the whole pin. It's display size unless the stage is too short, then 7svh, which holds all of it (eight lines at 1440×900). The pin is 160svh, under §7's 200vh; the fill takes 80% of it and the full statement holds for the rest.
- **Without JavaScript the statement reads filled, with no pin** (Part 6). It's readable unfilled too (fg-3 on black passes AA), but a long, still, gray scroll reads as broken; this matches the reduced-motion edition.
- **The bento's live values render in the browser** (Part 6), like the date line: the HTML holds the facts, and the role's length, the degree's progress, the clock and the overlap fill in after hydration from `lib/glance.ts`, so `content` never ships to the client. Times are written in en-US on the server and while hydrating, then in the visitor's locale: Lighthouse caught a hydration mismatch where an en-IN browser wrote "10:00 am". The e2e suite now hydrates the page in en-IN, de-DE and ja-JP and expects no error.
- **The visitor's day is content** (Part 6). The overlap compares Akshat's hours with a visitor's 09:00–17:00 (`copy.about.visitorDay`), so even those numbers come from content.
- **The bento keeps fixed shapes from square rows** (Part 6). Rows are as tall as a 6-span tile is wide on phones and a 4-span tile from tablets up, so tiles are squares, 2:1 and 3:1, per §4.5. Phones keep two small tiles to a row instead of stacking every tile.
- **The flipping tiles swap faces at the midpoint** (Part 6). backface-visibility alone showed the back face mirrored in WebKit, which flattens 3D under the tile's clipping. Each face's opacity switches when it's edge-on.
- **The hero's chips are "Key facts"** (Part 6). Their list was named "At a glance", which the bento's heading now is; two lists with one name read as one to a screen reader.
- **Highlight films are content, and checked** (Part 6). Each highlight's `film` names its kind and the figures it draws, and the schema fails the build if a figure isn't stated by the notes the highlight cites. The films use the footnotes' own words ("300+", "2,500+", "$0.08–0.11"), and they invent nothing: the cost counts up from $0.00 (the uncompressed cost isn't in the résumé), the bars are a week at the stated daily count, and the ROC curve's area is exactly the AUC.
- **Films are server-rendered SVG and CSS, resting on their final frame** (Part 6). They cost no JavaScript, and they animate only on the playing card, so a paused, off-screen or reduced-motion card shows its final frame. Staggered parts fade out at the end of their own loops, so nothing flashes when a loop restarts. The 300-dot field is one patterned shape with the 50 survivors drawn on top, which took 50 KB off the page.
- **The reel's cards are dark** (Part 6), like Apple's highlights, with the dark tone set on each card, so the films draw in the on-dark accent on any surface.
- **The reel's pagination dots are 36×44 on phones** (Part 6). Seven 44-wide targets and the pause control don't fit at 390px. They're above WCAG 2.5.8's 24px, and swipes, the arrow keys and each card's + reach every card too. From tablets up they're 44×44.
- **Performance after Part 6** (Part 6). The new sections add 9 KB of HTML (gzip) and 7 KB of JavaScript: first-load JS is 162.6 KB, under the 170 KB budget. Under DevTools throttling performance is 0.99, LCP 1.5s and CLS 0; on localhost the simulated score fell from 0.96 to 0.94, for the reasons in the entry above. Best practices and accessibility stay at 1.0.

---

## Open conflicts

Each entry is a pair of rules that can't both hold as written. They are deliberately left unresolved. An entry stays open until a decision changes the rules it names, and that decision and its reason go in §12. C2, C4, C6 and C7 were resolved that way in Part 2, and C3 in Part 4.

### C1. Hover-only delights

- **§2 rule 5:** no content that only hover reveals.
- **§8:** every section hides one delight "behind a click or a hover".
- **Clash:** a delight behind a hover alone is content that only hover reveals. It would also be missing from the full keyboard path (§2 rule 7).

### C5. Sentence case

- **§4.4, §9:** sentence case everywhere and throughout.
- **§3.1, §3.2:** the section "Research & Publications" and the "Tech Specs" page are in title case (compare "Credentials & honors").
- **Clash:** as written, both names break the rule.

