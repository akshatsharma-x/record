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
7. [Signature moments](#7-signature-moments): [The hero](#71-the-hero) · [The statement and About](#72-the-statement-and-about) · [The highlights](#73-the-highlights) · [The edit](#74-the-edit) · [Research](#75-research) · [Work](#76-work) · [Skills](#77-skills) · [Credentials](#78-credentials) · [Contact and the footer](#79-contact-and-the-footer)
8. [Surprises](#8-surprises)
9. [Voice](#9-voice)
10. [Budgets](#10-budgets)
11. [Stack](#11-stack)
12. [Decision log](#12-decision-log)

- [Open conflicts](#open-conflicts): [C5](#c5-sentence-case). C2, C4, C6 and C7 were resolved in Part 2, C3 in Part 4 and C1 in Part 13 (§12).

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
5. **Respect the visitor.** Native scrolling, with no hijacking and no smooth-scroll library. No preloader or intro gate, no modal on load, no autoplaying sound, and no content that only hover reveals: a delight behind a hover only decorates what's already there (§8).
6. **Performance is design** (§10). Animation is frame-rate independent: it's driven by time or by scroll position, never by frame count, so 60 Hz and 120 Hz ProMotion screens look identical. Animate transform and opacity; filter only sparingly.
7. **Accessibility is design** (§10). WCAG 2.2 AA, targets of at least 44×44 pt, a full keyboard path and VoiceOver testing. Single-key shortcuts can be turned off (§6.3).
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
| `/work/[slug]` | A case study. Opened from inside the site, it expands over the page as a sheet (§7.6). |
| `/research/[slug]` | A paper page. |
| `/specs` | The full "Tech Specs" page: every skill by category, then education and coursework. It prints as itself (§7.7). |
| `/compare` | "Compare Akshat models.": Akshat's years side by side, as Apple compares its models (§8). No menu links to it; Search's "compare" and /colophon's things to find do. |
| `/colophon` | How the site is built: a sheet like /specs (Part 12). |
| `/api/contact` | The composer's endpoint (POST only, §7.9). |
| `/api/ask` | Ask's endpoint (POST only, §6.3): a question in, a cited answer out, as server-sent events. |
| 404 | "This page is out of focus.", and a button that brings it into focus on the way home (§8). |
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
- The crossfade runs over the outgoing section's empty foot (its bottom padding; a quarter of a viewport where it has none, and never more than the last 20% of the section), and text tokens switch at its midpoint. When the scroll comes to rest partway, the light settles to the nearer end, so no text is left on a half-lit gray, and a journey (the Island's, Search's, a jump) holds its light and changes it once, crossfaded, on arrival (Part 17).
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
- **Safe areas:** the page draws edge to edge (`viewport-fit=cover`), and its side margins are the gutter or the safe area's inset, whichever is wider, so nothing sits under a notch or a rounded corner in landscape. Fixed controls at the foot add the bottom inset.

### 4.6 Radii

| chip | control | card-s | card-l | pill |
|---:|---:|---:|---:|---:|
| 8 | 12 | 18 | 28 | 999 |

Add `corner-shape: squircle` inside `@supports` for continuous corners, and re-tune those radii so the fallback looks the same: 1.84× (chip 14.75 · control 22 · card-s 33 · card-l 51.5) cuts each corner by the same amount. Capsules (pill) keep round ends.

### 4.7 Materials

Inspired by Liquid Glass.

- **Glass:** light `rgb(255 255 255/.72)`, dark `rgb(28 28 30/.72)`, with `backdrop-filter: saturate(180%) blur(20px)` plus the `-webkit-` prefix, a 1px inner specular rim (light on top, shade at the bottom) and no heavy shadows.
- **Fallback:** solid materials under `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors`, set at the glass tokens themselves so every surface that reads them follows. With more contrast the hairlines go from 8% ink to 36%. Under forced colors every color is the system's, so what a fill alone said is said in system colors instead: a choice (the checked segment, the current section, the selected result, the timeline's clip under the playhead) is the system's highlight, a switch draws its track and thumb, and the reel's dots are drawn in the text color.

### 4.8 Elevation

Soft and rare: `0 2px 8px rgb(0 0 0/.04), 0 12px 40px rgb(0 0 0/.08)`.

### 4.9 Layers

Bottom to top:

1. The page background: the surface backdrop that crossfades between sections (§4.2)
2. The shared 3D canvas
3. Content, including section text
4. Sticky elements
5. The Island
6. Overlays (`<dialog>` in the top layer), and a closing case study's ghost just beneath them (§7.6)
7. The cursor: a popover in the top layer that re-stacks itself above dialogs and other popovers (§6.1)

Anything above the canvas is transparent where a scene shows through it.

### 4.10 Icons

- Lucide at a 1.5px stroke, which sits well next to SF.
- Tech logos come from Simple Icons (CC0), in monochrome: one sprite, `/skill-icons.svg`, made at build time from the package's files for the slugs content names (§7.7).

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

- for touch and pen: the custom cursor runs only under `(any-hover: hover) and (any-pointer: fine)`, so wherever a mouse or trackpad is attached (an iPad's too, though its main pointer is a finger), and a touch or pen event hands over at once;
- until the first pointermove gives a real position; `html.cursor-custom` then hides the native cursor in the same frame the dot appears;
- over native zones (CSS exempts them from `cursor: none`), in forced-colors mode and during native drag and drop;
- through a watchdog: if the cursor loop throws, or goes 500ms without a frame while the pointer moves, `html.cursor-custom` comes off and the failure is logged once.

**Preferences.** With reduced motion there are no springs and no drift, and shape changes are instant. Shake to locate still works, because it changes size, not position; the idle ring fades in place instead of growing. With `prefers-contrast: more`, the outline is 2px, the inks are opaque and the magnetic tint becomes a solid ring.

### 6.2 The Island

A living black pill at the top. It is the nav, the section indicator, the scroll progress and the place where every confirmation appears. Built in Part 4: `components/island/`, with its state in `lib/island/store.ts`.

- **Shape.** Black in both themes, with a hairline at rgb(255 255 255 / .14) so it reads against black, 12px below the safe area at the top center. Collapsed, it's 36px tall (a 44px target) and holds the "AS" monogram, the current section's name and a 14px scroll-progress ring. Its width hugs the content. When the section changes, the name swaps with a 180ms blur-crossfade while the width springs on the island spring, so the pill seems to breathe.
- **Expanded** on hover (after a 120ms intent delay), click, tap or keyboard focus. It springs into a rounded rect holding the seven section links (the current one marked), Search ⌘K, the theme toggle and an accent "Say hello" pill. Escape collapses it, and so do a click outside, focus leaving and the pointer leaving after a 300ms grace period. On phones, a tap opens a full-width sheet of 44pt rows over a dimmed page, its actions (Search, the theme and "Say hello") along its foot, nearest the thumb.
- **Activities.** Other parts confirm things with `island.show({ icon, title, detail?, tone })`, where the tone is neutral, accent, success or error. The pill grows into a wider capsule for 2.2s, then returns. Activities that fire rapidly queue, and each gets its full time. The same message twice in a row extends the one showing instead of repeating, and while the Island is expanded the queue waits. Each one is announced through a visually hidden role="status". An activity can offer a link (`action`, such as "Show me where"'s "Jump to Cognivault AI ›", §7.7) and can `persist` until `island.dismiss(title)` ends it, for as long as a mode lasts.
- **Semantics.** A `<nav aria-label="Primary">` with a disclosure button (aria-expanded, aria-controls). The links are real anchors to `/#id`, so they work without JavaScript; without it, the Island renders open at the top of the page and scrolls away, and on a phone, where open it's a tall sheet, it takes its place above the hero rather than over it. On the home page, a link travels to its section smoothly (instantly with reduced motion), updates the URL and moves focus to the section's heading. The current section's link has aria-current="true". Overview is the hero (`#top`) and stays current through About and Highlights. `scroll-padding-top` keeps every heading clear of the pill.
- **Reduced motion:** the shell changes size at once, and the name crossfades without blur.

### 6.3 Search

Search everything, jump anywhere and run actions. Built in Part 4: `components/search/`, with matching in `lib/search/`.

- **Opening.** ⌘K or Ctrl K, anywhere, even while typing; "/"; or the Island's Search button. Search is a centered glass panel in a top-layer `<dialog>`, 640px wide, with a 24px field. Its glass is denser than the generic material (96% in light, 86% in dark), so secondary text clears 4.5:1 over any page. The field is always focused while Search is open, so the focus ring frames the panel.
- **Results** are grouped as Top hit, Sections, Work (roles and projects), Research, Skills, Credentials (education, honors and certificates) and Actions. With nothing typed, it suggests questions to Ask (Part 14), the seven sections and the actions. Results resolve in 40ms apart, and the selection highlight slides between rows on the snappy spring.
- **The index** is built from the content at build time (`content/derive.ts`) and served as `/search-index.json`, fetched the moment a visitor shows intent. Pages that don't exist yet link to their home section.
- **Matching** is fuzzy. Every typed word must match the title, keywords, subtitle or body: exactly, as a prefix, inside a longer word (four letters or more), typed together along word boundaries ("nextjs") or with a typo (one edit from four letters, two from eight; a transposition counts as one). Skill aliases and a small vocabulary (`lib/search/vocabulary.ts`) let a word find what it means: "rag" finds Cognivault AI and United Airlines, and "llm" finds Cartographer.
- **Keyboard.** ↑ and ↓ move, Enter opens, ⌘Enter or Ctrl Enter opens in a new tab, and Esc closes. The field is a combobox that drives a grouped listbox through aria-activedescendant, so focus stays in the field. The page behind is inert, focus returns where it was, and a live region announces the count.
- **Arithmetic.** A small parser works out typed sums, never eval: "12*7" shows 84, and Enter copies it.
- **Actions:** Copy email, Open LinkedIn, Open GitHub, Toggle theme, Change finish (or a finish by name), Larger cursor, Use system cursor, Show grid (G), Focus mode (F), Print the résumé edition and Single-key shortcuts. Each confirms itself through the Island.
  - **Show grid** lays the design grid over the page: its columns and gutters at the content width, the 8pt baseline, and rulers at the breakpoints (§8).
  - **Focus mode** keeps the section under the pointer, or the one with the keyboard's focus, lit, and dims and softens the rest of the page. F or Esc turns it off.
  - **Print the résumé edition** prints a one-page résumé typeset from the content, with no phone number (§8). Printing any page prints it.
- **Secret commands** (Part 13): "hello", "9:41", "sudo hire akshat", "compare", "retro" and "clarity" (§8). Each shows only when its whole phrase is typed, as the Top hit, and never among the suggestions.
- **Single-key shortcuts** ("/", G and F) never fire while typing, with a modifier or behind a modal dialog. Search can turn them off, and the choice persists, as WCAG 2.1.4 requires.
- **Ask** (Part 14): questions about Akshat's work, answered only from the site's own content, every claim tied to the section it came from (the idea behind Cognivault AI, applied to the portfolio).
  - **In Search.** A query that reads like a question (it ends with "?", or starts with what, how, why, who, which, does, is, can or tell) makes the Top hit "Ask: …" (`lib/ask/question.ts`); what would have been the Top hit leads its group. With nothing typed, the Ask group suggests four questions (`copy.ask.suggestions`). Enter, or a suggestion, streams the answer where the results were, while a soft band of the finish's two accents travels round the edges of the screen; it fades when the answer is whole, and stands still with reduced motion.
  - **The answer** is 90 words or fewer and calls Akshat by name, never a pronoun. Each cited claim carries the number of its source; the sources follow as chips ("Experience · United Airlines", "Work · Cognivault AI"). A chip closes Search and goes there, as Show me where's jump does (`lib/jump.ts`; a section travels as the Island's links do), and the place lights up for a moment. A screen reader hears "Answering", then the whole answer. Editing the question puts the answer away.
  - **Without the model** (no key, the switch off, a spent limit or no connection), the same panel answers from Search's own index, already in the page: its best few entries, quoted, each with its chip, under a line that says why (`lib/ask/fallback.ts`). A question nothing answers, or one the model declines, offers Contact.
  - **The endpoint** (`app/api/ask/route.ts`, `lib/ask/server.ts`) takes the site's own JSON (`lib/request-guard.ts`, shared with Contact) and a question of up to 500 characters. It asks `ASK_MODEL` (default `claude-opus-5-5`) through Anthropic's TypeScript SDK at effort `low`, with no sampling settings, and streams the answer back as server-sent events (`lib/ask/protocol.ts`). The site's content is rendered as plain-text documents, one per section or entity (`lib/ask/documents.ts`), sent with citations on; each citation names its document, and so its chip. The system prompt and the documents are a frozen prefix with the cache breakpoint on the last document, and the question comes after it. The server-side refusal fallback is on (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`), and the stop reason is checked before an answer counts: a refusal drops what streamed. The prompt: the documents only; "not in the portfolio" and Contact when they don't say; never a phone number; and the question is data, not instructions.
  - **Guardrails.** `ASK_ENABLED=true` and a key, or nothing is generated. Ten questions a minute per IP and two hundred a day in all, with Upstash (in memory in development; none in production without Upstash, so it fails closed). Nothing logged holds a question: counts, timings and tokens only.

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
| Hero | Portrait mode; until there's a photo, "Into focus" | 5, 18, 19 |
| Statement | Word fill, plus the At-a-glance bento | 6 |
| Highlights | The reel | 6 |
| Experience | "The edit", a multi-track career timeline | 7 |
| Research | The lights go down, then the living abstracts | 8 |
| Work | A bento grid whose tiles expand into case-study cards | 9 |
| Skills | "The chip", an exploded 3D view | 10 |
| Credentials | The wallet and the medals | 11 |
| Contact | The dock and the composer | 12 |

### 7.1 The hero

Built in Part 5, rebuilt in Part 18 and set in motion in Part 19 (`components/hero/`, logic in `lib/hero.ts`). Two editions, one content: the portrait edition switches on by itself when `profile.photo` exists; until then the typographic edition ships. Both read in full without JavaScript and with reduced motion. Neither says where Akshat is: no date line, no clock, no country, city or time zone on the first screen, for screen readers either (Part 18).

**Shared content.** The role, the name and the headline, the name white, falling to 74% at the foot of each line like light across a surface; then two ways on: the "See my work" pill (#work) and "Say hello ›" (#contact). At the foot, the key facts, set like a product page's specs: each a label over its value and a link to its section, read as one phrase ("Now: AI & ML Intern, United Airlines"). Now is the current role at its company, and it jumps the edit's playhead to that role; Studying is the degree (B.Tech CSE ’27, Manipal University Jaipur); Presented is the conference (SCI-2026, Springer LNNS). All three are derived (`heroFacts`). Then the finish: four dots and the chosen one's name, as a product's color picker shows them. Choosing one wipes the new finish out from its dot over 600ms and says so in the Island. Without JavaScript the finish is hidden, since it couldn't change anything. From tablets up the facts are a row, and the finish closes it where it fits; on phones, a list. Every word in the light's reach is white (Part 5): the labels step down in size and up in weight rather than in color.

**Arrival.** CSS from the first paint, over within 1.2s, with no gate: the name comes into focus line by line (blur and rise, never transparent, so it's the LCP at once), the role and headline fade in after it, and the UI comes last, rising 10px into place: the two ways on, then each key fact 30ms after the one before, then the finish, onto a rule that draws out from the middle (Part 19). Then nothing moves on its own. Nothing loops, so there's nothing to pause.

**Typographic edition: "Into focus"** (Part 18). The name is huge and centered on the dark surface, on two lines on phones, with the role over it in the finish's two hues. Behind it are two identical fine dot grids (a 14px pitch), masked to the middle of the screen. The upper one arrives turned 12° and scaled 1.12, the moiré of a system that isn't clear yet. It slides into register in 900ms as the name comes into focus: complexity turned to order, which is what the headline says Akshat does. Below, a still stage light rises from under the name: soft glows in the finish's two hues and the hour's warmth (dawn, noon, dusk, night). It never reaches higher than half the screen, so the role's hues keep their contrast on black. As the name settles, a glint crosses it from 500ms to 1.2s, a soft band of light like light catching metal, and the name's sheen falls to 64% at the foot of each line so the band has something to brighten (Part 19).

**In motion** (Part 19). Nothing moves on its own once the arrival is over; everything else answers the visitor, on the smooth spring. Under a mouse:
- the dots near the pointer take the finish's hue and grow a little, in a soft pool of it, like LEDs lighting under a hand; the pool lies outside the field's mask, so where the field has faded, it finds it in the dark;
- the glint follows the pointer across the name, and slides off to the right when the pointer leaves;
- the upper grid follows the pointer up to 6px (under a dot's pitch) and the light moves 12px against it, as a tilt that needs no permission does on phones.

Scrolling away, by the time 60% of the hero has gone, the name lifts, recedes to 90% and fades; the field tilts back 56° into a floor under it; the light rises and swells; and the key facts drop away. With reduced motion the grids are already in register, nothing glints, lights or follows the pointer, and nothing recedes or tilts. The loupe (§6.1) magnifies the name.

**Portrait edition.** Layers, back to front: the background plate (blurred like bokeh, and past its 3:4 frame a heavier blur of itself), the name in white, Akshat cut out, then the UI. The arrival is a focus pull: pre-blurred copies of the plate (24px) and the subject (12px) fade off the settled ones (8px and sharp), so no blur animates on a full-screen layer (§5.4). The pointer moves the layers in depth on the smooth spring (plate ±8px, name ±4px, subject ±12px); on phones a tilt does, where it needs no permission. Scrolling away, the subject scales to .92 and rises slower than the name, which fades upward as the light dims. The ƒ button opens the aperture dial, ƒ1.4 to ƒ16 in full stops, which sets the plate's blur live (24px to 2px; ƒ4 is 8px) for the session. On phones the first screen is the Lock Screen (the name behind the head, the role and the headline); the two ways on, the key facts and the finish follow on the dark floor. The photo's `headTop` places the name and the phone frame, so the head covers only the foot of the letters.

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

Only the card in view plays, while the reel is on screen and the tab is visible. One control at the bottom right pauses the whole reel for the session (WCAG 2.2.2), and the current card's dot stretches into a bar that fills with its film. Every dot is a 44pt target; on a phone, where seven of them and the pause don't share a row, the pause sits under the dots. Swipes and trackpads scroll it natively, a mouse drags it (the cursor shows its drag state), and the arrow keys, Home and End move between cards: Tab reaches only the card in view, its footnote marks and its +. Each card's + opens a sheet with the full fact, its footnote and a link to its section. With reduced motion every card rests on its final frame.

### 7.4 The edit

Built in Part 7 (`components/experience/`, the scroll and playback in `lib/edit.ts`, the tracks and panels in `content/derive.ts`). Experience as a pro video editor: a viewer over a multi-track timeline the visitor scrubs.

**Pinned**, on screens at least 1069px wide and 760px tall, with motion and JavaScript, for 280svh. The viewer (about 60%) shows the active panel. A role's panel has its company, role, dates, location (hidden while null), summary, first three highlights, metrics as counters with their footnotes, and stack chips, beside its visual. The conference, the degree and each honor have panels too. The timeline (about 40%) runs on a real time scale from July 2023 to today, with a tick a month, a label each January and a "Now" marker, over four tracks:

| Track | Clips |
|---|---|
| WORK | The four roles. EY and United overlap in June–July 2026, so they stack on two lanes, both whole. |
| RESEARCH | SCI-2026, 28–29 April 2026: a sliver with its name beside it. |
| EDUCATION | The degree, one clip that fades on past today. |
| HONORS | Year brackets, since content knows the year and never the month. |

The playhead follows the scroll exactly. The clip under it is active (the top track wins, then the upper lane, so EY shows in the overlap), and the viewer cross-dissolves to it with the Resolve. The panels not on show are inert, so no pointer, key or screen reader reaches them, but only transparent, not unrendered, so a reader view still finds every role. Each role and the conference hold the viewer for the same scroll, however long they ran, and stretches only the degree covers pass in at most half that. A click springs the playhead to a clip on the smooth spring. A honor is a marker: choosing one shows it while the playhead stays in its year.

**Keyboard.** The timeline comes before the viewer in the document, so Tab reaches the clips first, in time order: the roles, the conference, the degree, then one stop for the honors (the arrow keys move between them), then the panel on show. Focusing a clip chooses it. While the timeline has focus, Space plays and pauses (a role per 2.5s at 1×), and J, K and L shuttle backward, pause and forward at 1×, 2× and 4×. "Press Space to play" shows under the timeline while a clip has keyboard focus. Playback scrolls the page, so the visitor's own scroll always wins: a wheel, a touch or any scroll it didn't make stops it. A keyboard user leaves the section in at most 10 presses.

**The role visuals** are abstract SVG, server-rendered, resting on their final frame. Each plays once, in about four seconds, when its role comes on, and pauses off-screen and in a hidden tab. Each draws only figures its role's text or notes state, labeled as they word them, and the schema checks them.

| Role | Visual |
|---|---|
| United Airlines | Tangle to map: a knot of code-like strokes untangles into a knowledge graph, two pulses become six documents and the cost settles on $0.08–0.11. |
| EY | Route segments assemble a UI, a JWT travels from the API into the client and rows land in PostgreSQL. |
| Truechip | 10+ module blocks snap together, a coverage ring fills to 90%+ and a defect line drops ~30%. |
| WalkingTree | A dashboard builds itself: skeleton bars, and a daily-active-users line that rises to 2,500+. |

**The stack**, on phones, with reduced motion, on short screens and without JavaScript, has no pin. The role cards stack under a compact, read-only strip of the same tracks, each visual on its final frame and each figure as stated. The strip is hidden from assistive tech, since the cards carry everything it shows.

### 7.5 Research

Built in Part 8 (`components/research/`, the illustrations' shapes in `lib/research.ts` and `lib/haze.ts`, citations in `lib/cite.ts`, the papers in `content/derive.ts`, each paper's page at `app/research/[slug]`). The bar is honesty: the section states only what content does, and its illustrations draw ideas, never results.

**The lights go down.** As #research arrives, the surface controller dims the page to black. "Research." stands in the serif italic over `copy.research.sub` and where the papers were presented: "Presented at SCI-2026 · Swinburne Vietnam, Hanoi · 28–29 April 2026 · Springer LNNS".

**Two chapters, one per paper: the living abstracts.** On screens at least 1069px wide and 760px tall, with motion, each chapter pins for 160svh (under §5.5's 200vh for these) while its illustration plays from the scroll. On the left, the abstract card: the title in the serif at title size, a status pill ("Accepted · Presented April 2026", "Published" once a DOI exists), the TL;DR at lead size, the keywords and three actions. Read links to the DOI and stays hidden without one. Share opens the system's share sheet or copies the link. Cite flips the card to the paper's citation in APA, IEEE or BibTeX, from a segmented control, with Copy, which the Island confirms ("Citation copied"); it's offered once content names every author (Part 17). Done or Escape flips it back. On the right, the paper's concept illustration, always captioned `copy.research.caption` ("Illustration of the idea, not results from the paper"):

| Paper | Illustration |
|---|---|
| Food waste in cold chains | A route from farm to storage to transport to retail draws itself with the scroll, over the temperature along the way, with a dial of risk at each stop. The temperature leaves its safe range on the way to transport, and the risk rises from there. Hovering, focusing or tapping a stop opens "Why?": attribution bars for illustrative factors (temperature excursions, dwell time, distance). |
| PM2.5 forecasting | A minimal skyline in a particle haze, on a 2D canvas, over the level of fine particles: observed up to now, then forecast inside an uncertainty band that widens the further ahead it looks. The scroll carries the forecast's reach from now to the horizon; dragging the handle (or its arrow keys) takes it over, and the haze thickens or clears with the level there. |

The illustrations show no numbers at all: shapes, dials and bars, and words from content (the stops, the factors, the hints). Their shapes are illustrative by design and live in `lib/research.ts`.

**Phones, reduced motion and no JavaScript** get a column with no pins. Each illustration opens on its final frame, and Step through taps through it: the stops one by one, or the forecast from now to the horizon. Without JavaScript, Cite goes to the paper's page, where the citations switch with CSS alone.

**A paper's page** (`/research/[slug]`, prerendered for every paper): the title, the authors (Akshat in bold), the venue, the status, the TL;DR, the abstract once there is one, the keywords, the illustration at the content's width, the citations and related work, which names what each project shares with the paper. It carries Google Scholar's tags (`citation_title`, `citation_author`, `citation_conference_title`, `citation_publication_date`, and `citation_doi` once there is one) and schema.org ScholarlyArticle JSON-LD. An unknown slug is a 404.

### 7.6 Work

Built in Part 9 (`components/work/`; the packing in `lib/bento.ts`, the diagrams in `lib/architecture.ts`, the bento's behavior in `lib/work-behavior.ts`, the sheet's motion in `lib/case-sheet.ts`, the tiles and case studies in `content/derive.ts`; the routes are `app/work/[slug]`, the `@modal` slot and its intercepting `(.)work/[slug]`). As with research, the bar is honesty: every word on a tile, in a preview or in a diagram is the project's own (the schema checks), and every figure is one its text states.

**The bento.** `copy.work.headline` over its sub, then a filter: All · AI · Full-stack · ML · Accessibility (`copy.work.filters`, each a set of categories). It's a segmented control from 735px up and a row of chips that scrolls sideways on phones. Its radios are CSS's, so it filters without JavaScript; with it, the grid reflows in a View Transition, each tile gliding on the smooth spring, and a status line says how many projects show. On twelve columns with square rows, the flagship (the first project) takes 8×2 wherever it shows, the next stands 4×2 beside it and the rest share rows of 4×1; every filter packs with no holes (`lib/bento.ts`, tested for any count). Tablets pack in sixes; phones stack the tiles at 4:5.

**A tile** carries its category, name, tagline, top metric (footnoted) and living preview, tilts under its highlight (§6.6) and shows "Open" under the cursor. A short tile sets its words smaller; a wide one sets them beside the preview. Until content has screenshots, the preview is the cover; the first screenshot replaces it with no code change.

| Project | Preview |
|---|---|
| Cognivault AI | A query splits to three agents passing messages over A2A; a HyDE document appears, FAISS's nearest neighbors light up and a summary resolves. |
| QuizMUJ | A live exam room: seats fill, and a tab switch blips on the proctor's view. |
| Automated Resume Screening | Résumés flow into two lanes, TF-IDF and BERT, that merge into a ranked list, while a PCA scatter settles into clusters. |
| Predictive Customer Churn | An ROC curve draws to its 0.98 (its area is exactly that) while the tile's 97% counts up. |
| Web Accessibility Analyzer | A scan line sweeps a page, issues pin to its elements and a score ring fills. |

A preview plays once on hover or focus, or the first time its tile comes into view on a touch screen, and rests on its final frame, which is also what reduced motion and no JavaScript show. It's SVG and CSS, labeled from `projects.*.preview`.

**The sheet.** A tile opens its case study at /work/[slug], intercepted into the `@modal` slot: a full-screen sheet in a top-layer `<dialog>`. The card grows into the sheet while its title and cover fly to their places and the rest fades in; behind it, the page scales to .94, dims and rounds its corners on a black desk. ×, Escape, the dimmed page, the back button or a downward drag on a touch screen close it, all by going back a step, and it folds back into its tile; the page's scroll position and focus come back with it. Every transition can be turned around: it's one spring-driven state, so closing mid-expansion reverses from where it is, with its speed. Once its route has gone, a closing sheet flies home as a ghost, a copy beneath the cursor. A direct visit or a reload renders the same case study as a page.

**A case study** (`components/work/case-study.tsx`): the eyebrow, title and tagline, the cover, and a facts row (Year and Role, each hidden while null, and Stack). Then the chapters, in `copy.work.caseStudy`'s words: the problem (hidden until content has it); the approach, with an architecture diagram that draws itself, step by step, as it scrolls into view; the outcome, as counted metrics with their footnotes, or the qualitative outcome when there are none; what it's built with, as chips that link to the skills, and links to the code and the live site once they exist; and the next project, a card that grows into its case study. Its notes are its own.

| Project | Diagram |
|---|---|
| Cognivault AI | Query → intent orchestrator → A2A agents → FAISS + HyDE → Gemini Vision PDF extraction → summary, evaluated with Ragas |
| QuizMUJ | Roles → Express API → MongoDB; the live exam room (Socket.io) → proctor events; CSV bulk upload, analytics export and Docker beside them |
| Automated Resume Screening | Résumés → extraction → TF-IDF and BERT → weighted ensemble → candidate matching → the XAI dashboard (PCA) |
| Predictive Customer Churn | Data → SMOTE → base learners → stacking meta-learner → 97% · 0.98 → feature importance → retention insights |
| Web Accessibility Analyzer | URL → headless crawler → WCAG 2.1 rules → score and fixes → report |

### 7.7 Skills

Built in Part 10 (`components/skills/`; the chip's geometry in `lib/chip.ts`, its shared state in `lib/chip-state.ts`, the honeycomb in `lib/honeycomb.ts`, the behavior in `lib/skills-behavior.ts`, evidence in `content/derive.ts` and `lib/evidence.ts`, the full sheet at `app/specs`). The bar: every skill is reachable by keyboard and screen reader in the specs, and every "used in" is a role, project or paper that names it.

**The chip.** On the dark surface, under `copy.skills.headline`: a procedural chip in three.js, with nothing downloaded. Six slabs make it: the die (engraved "AS", ringed by cores in the finish's accent), an interposer, the heat spreader, a routing layer, the package and the substrate on its solder balls. It's lit by drei Lightformers, with no HDR file. It renders on the shared stage (§10) through a drei `<View>`, on demand, and only while on screen. As its stage scrolls (230svh, sticky), the chip rises and turns into view, then explodes into six labeled layers, top to bottom: AI & ML · Data & analytics · Frameworks & backend · Languages · Platforms & tools · Foundations (`copy.skills.chip.layers`, which the schema keeps equal to the categories). Each label shows its count. Hovering, focusing or tapping a label (or, in 3D, the layer itself) slides that layer out like a card from a deck, and its skills appear beside it as a list. The die's button ripples the cores, ring by ring (§8). On tier LOW or OFF, with reduced motion or without JavaScript, the chip is a crisp SVG poster of the exploded view, drawn from the same projection, so the labels sit at the same corners in either edition; its layers slide out in CSS. On phones the labels are a list under the chip, in the stack's order. The scene's stage is taller than the poster, so the poster gives way to it only off screen and while the page is still, and the page keeps its place around the change: what's in view never moves.

**The core six:** Python, TypeScript, Java, LangGraph, Next.js and FastAPI (content's `core` skills), as large tiles with their logo and what they were used in: each role (to its panel in the edit), project (to its case study) and paper (to its page). No bars, percentages or years.

**Every skill, two ways**, from a segmented control (Specs | Cloud) whose radios CSS reads:

- **Specs:** in the manner of Apple's Tech Specs pages: each category on the left, its skills on the right in columns, between hairlines, with room to breathe. Each skill is a button.
- **Cloud:** a watchOS-style honeycomb of every skill as a round icon (its Simple Icons logo, or a monogram), the core six in the middle. A fisheye centers on the pointer, so the pointer is at the middle of the effect: icons grow by a Gaussian, and along each ray the spacing grows with the size, so neighbors never overlap. Dragging pans it; on touch screens the fisheye stays on the middle while you drag, and a tap chooses. The arrow keys move between neighbors. The icon under the pointer, or in focus, is named beneath.

**Show me where.** Choosing a skill in either view lights up the roles, projects and papers that name it (the edit's panel and clip, the bento's tile, the paper's chapter), dims the rest, and the Island offers a jump to the first ("Jump to Cognivault AI ›"), as a persisting activity. The same jump, and "Show all", appear right after the skill, so the keyboard reaches them in one step. Choosing it again, "Show all" or Escape ends it. A skill nothing names says so.

**"See full tech specs ›"** leads to /specs: every skill by category, then education and coursework, as one sheet that prints as itself.

### 7.8 Credentials

Built in Part 11 (`components/credentials/`; the passes and the medals in `content/derive.ts`, the stack in `lib/wallet.ts`, the medals' outlines and engravings in `lib/medals.ts`, their motion in `lib/medal-motion.ts`, their 3D geometry and textures in `lib/medal-textures.ts`, the QR codes in `lib/qr.ts`, the behavior in `lib/credentials-behavior.ts`). The bar: a certificate added to content is a pass with no code change, and nothing shows that content doesn't state.

**The headline** derives from data: `copy.credentials.headline` ("Credentials.") with at least one certificate, `headlineWithoutCertificates` ("Education.") with none. It never counts.

**The wallet.** Passes, stacked as a wallet app stacks them: the pass in front shows whole, and each of the others shows its top, its kind and its name, beneath it; the stack's last fades away as though into a pocket. Each pass is a 3:2 card in its own color, never a logo: Education wears the finish's gradient, each certificate the finish's other tones in turn, or its issuer's tone from content (`certificates.*.tone`, which the schema holds to 4.5:1 under white type). The front has what it is, its name, its issuer (or its degree), its fields as a wallet sets them (a small label over each value, a credential ID in mono) and, when there's a public page that verifies it, a QR code to that page, made at build time so a phone can scan the screen. Hovering lifts a pass; clicking one in the stack, or Enter, brings it forward while the others slide down beneath it on the smooth spring. Its ⓘ turns it over in 3D, each face's back hidden, to the skills it covers, what it proves, the link to verify it and when it expires. The ⓘ is a checkbox, so a pass turns over without JavaScript too.

The first pass is always Education: Manipal University Jaipur · B.Tech, Computer Science and Engineering · Class of 2027 · CGPA 8.79/10, with the coursework, Class XII (95.4%, 2022) and Class X (93.8%, 2020) on its back. Certificates follow in content's order. `content.certificates` is empty for now; /dev/kitchen shows the whole wallet with the fixture certificates in `content/fixtures.ts`.

**Expiry is honest.** The build marks a pass "Expired" only once its month is before the latest month content knows has begun (the edit's scale, §7.4); the browser marks the rest by the visitor's calendar once it loads. An expired pass says so on its front, with a badge, and on its back.

**Keyboard.** The stack is one tab stop, its front pass, then that pass's ⓘ. The arrow keys, Home and End move through the stack in the order it's seen; Enter brings the focused pass forward; F turns it over, bringing it forward first, and focus goes to its ⓘ, which says which side shows; Escape turns it back. F is the pass's own key while one has focus, so focus mode's F (§6.3) doesn't fire too.

**Reduced motion and no JavaScript** keep the server's plain grid of whole passes, and the turn is a crossfade.

**The medals.** "Recognition." (`copy.credentials.honors`), then one medal per honor, in the order they were won, each its own minted shape: a circle, a hexagon, a rounded square or a shield. Content chooses each honor's shape (`achievements.*.medal`), and the schema keeps them apart and checks that the line a medal carries states only what its honor's detail does.

| Honor | Shape | Engraved |
|---|---|---|
| Dean's List | Circle | Dean's List — 2024 |
| Smart India Hackathon | Rounded square | Smart India Hackathon — 2024 · 2025 · top 50 of 300+ |
| Student Excellence Award | Shield | Student Excellence Award — 2026 |

In 3D, each is a bevelled extrusion of its outline in brushed silver under a clearcoat, with a raised rim on both sides and the finish's accent in the enamel of its face. Both faces are engraved through a canvas: the face with its name, a rule and its line in tracked caps; the back with its description (its detail, else who gave it and when). Lightformers light them, with no HDR file, and each renders on the shared stage (§10) through a drei `<View>` of its own, on demand. A drag spins one around its axis, leaning a little toward a vertical drag, with inertia; a hard flick (16 radians a second or more) spins it fast and throws a glint; then friction slows it and a spring sets it down on the face it's turning toward. A click, Enter or Space turns it over. At rest a medal is exactly still, on a face, and nothing redraws.

Under each, in words: its name, its line, and its description with its footnote, so everything on either face is in the DOM. On LOW and OFF tiers, with reduced motion and without JavaScript, each medal is a still: both faces drawn in SVG from the same outlines and engravings, turned over by a click (a crossfade with reduced motion). Without JavaScript the turn isn't offered; the words carry both faces.

### 7.9 Contact and the footer

Built in Part 12 (`components/contact/` and `components/footer/`; the composer's rules in `lib/contact.ts` and its connections in `lib/contact-server.ts`, the endpoint at `app/api/contact`, the dock's magnification in `lib/dock.ts`, the behavior in `lib/contact-behavior.ts`, and /colophon at `app/colophon`). The bar: the phone number appears nowhere, every message reaches Akshat or the visitor's own mail app, and the dock works fully by keyboard.

**The close.** On a light surface, `copy.contact.headline` resolves from blur (§5.4). Under it come the availability line (`profile.availability`, hidden while it's null) and two live lines. The first is "It's 9:41 PM in Jaipur", or "IST" until the city is confirmed. The second says how Akshat's working hours (`profile.workingHours`, 10:00–18:00 IST) meet the visitor's day (`copy.about.visitorDay`, on the visitor's own clock): "Our working hours overlap 3:30–6:30 PM your time", or "I'll see it first thing in my morning". Only the browser knows the visitor's clock, so both lines fill in after hydration, in space kept for them.

**The dock.** A glass shelf of tiles: Email, LinkedIn and GitHub, and the résumé: a download once a phone-free PDF exists (§2 rule 2), until then the print edition, which it prints (Part 17). Email's tile wears the finish, GitHub's carries its mark from the skills' Simple Icons sprite, and LinkedIn's is a monogram (§12). Under a mouse the tiles magnify as macOS's do: the one under the pointer grows to 1.6×, its neighbors less, on a raised-cosine falloff that reaches 2.6 tile widths. The row spreads about the pointer, so no two tiles overlap and the one under the pointer stays under it, all on the snappy spring. Each tile's name shows as a tooltip on hover and on keyboard focus, and Escape hides it. A click plays the launch bounce and lights a dot under what it opened. Email copies the address, and the Island says "Email copied" and offers "Open mail app". Reduced motion, touch and the keyboard get no magnification, and need none: each tile is a plain link, in the tab order, at full size. Touch can't hover, so there each name sits under its tile, as the Home Screen labels its icons.

**The thread.** Styled as a message thread. Akshat's bubble opens it ("Hi — what are you working on?"), and the visitor's next bubble is the composer, with labeled fields for the name, email and message. Each field is checked as the visitor leaves it, and every field on send, in content's friendly words (`copy.contact.thread.errors`), by the same zod/mini rules the endpoint uses. A honeypot field waits out of sight and out of reach. Sent, the words swoosh up out of the composer into the thread as the visitor's bubble, "Delivered" appears under it, and the Island says "Message sent". If it can't send (the rate limit, no keys, a failure), the words stay, and "Send it from your mail app instead" opens the visitor's mail app with them already written. Without JavaScript the form, which can't check or send, gives way to the address itself: "Write to me at …", a link to the mail app.

**The endpoint.** POST /api/contact takes JSON from the site's own pages only, up to 24 KB, and checks, in order: the honeypot (a quiet 202 that sends nothing), the words (a 400 that names the fields), and the rate limit (five an hour per IP and per sender's address, in a sliding window, with Upstash; a 429). Then it delivers through Resend's API to Akshat with reply-to set to the visitor (a 502 if that fails). Keys live in the environment (`.env.example`). Without them, development uses a console transport and an in-memory limit, and a production build answers 503 and the page offers the mail app: it fails closed, and gracefully. Nothing logged holds personal data: no names, addresses, words or IPs.

**The footer.** First the notes, numbered as content numbers them, each with a ↩ back to every mention: numbered when there's more than one, and each a whole 44pt target. Then a site map (Overview, Work, Research, Specs and Colophon) and the settings: the theme, the finish, "Larger cursor" and "Use system cursor", as Search offers them. Last, "This site uses no cookies.", the credit and the © line with the visitor's year.

**/colophon** is a sheet in the manner of /specs: how the site is built, from `copy.colophon`.

---

## 8. Surprises

Small, tasteful and discoverable, and never in the way. Every section hides one delight, and the site adds a few of its own (Part 13).

- **The rules.** No surprise steals focus, plays a sound, blocks reading or fires more than once a session unless asked: the console's note and the clear sky's line say themselves once a session, and every other one happens only when the visitor does something. Each is reachable by keyboard, or purely optional: a delight behind a hover only ever decorates what's already on the page. Each respects reduced motion.
- **The parts.** Each surprise is a file in `lib/surprises/` that holds its flag, `define({ id, section, on })`, and its behavior where it has one of its own. Its words are content's (`copy.surprises`, and its entry in `copy.colophon.things`). It has an end-to-end test, titled `[surprise:<id>]` in `tests/e2e/surprises.spec.ts`; the unit tests check that every surprise has its file, its flag, its words and its test.
- **Flags** are fixed at build time, so the server and the browser always agree. `NEXT_PUBLIC_SURPRISES="+devanagari-name,-command-clarity"` turns any on or off for a build.
- **Things to find.** /colophon lists every surprise that's on, behind a spoiler that's closed until asked (a `<details>`, so it works without JavaScript too).

| Surprise | Where | What happens | Ships |
|---|---|---|---|
| `hero-lens` | Hero | The loupe magnifies the name under the pointer (the typographic edition, §6.1); with a portrait, the ƒ dial sets the background's blur. | On |
| `devanagari-name` | Hero | A click on the name blurs "Akshat" into अक्षत, in the same place, with "Sanskrit for 'unbroken'" under it; another click turns it back. Assistive tech hears the name throughout. | Off, until Akshat approves it |
| `glance-flips` | At a glance | Studying flips to the days to graduation, and Local time to 24-hour time (§7.2). | On |
| `edit-shuttle` | Experience | Space plays the edit, and J, K and L shuttle it (§7.4). | On |
| `clear-skies` | Research | The PM2.5 forecast's handle taken all the way right clears the sky completely, and the Island says "Clear skies ahead." Only the visitor's own drag or keys do it, never the scroll's play. | On |
| `core-ripple` | Skills | The die's button ripples the cores, ring by ring (§7.7). | On |
| `show-me-where` | Skills | Choosing a skill lights up what uses it, and the Island offers the jump (§7.7). | On |
| `medal-glint` | Credentials | A hard flick spins a medal fast and throws a glint (§7.8). | On |
| `dock-bounce` | Contact | An app opened from the dock bounces, and leaves the dot under it (§7.9). | On |
| `delivered` | Contact | "Delivered" appears under a message sent (§7.9). | On |
| `command-hello` | Search | "hello": the Island answers "Hello to you too." | On |
| `command-941` | Search | "9:41": every clock on the site (At a glance's Local time and the close's live line; the first screen has none, Part 18) shows 9:41 in the morning, Akshat's time, for five seconds. | On |
| `command-sudo` | Search | "sudo hire akshat": "Permission granted.", then a jump to Contact. | On |
| `command-compare` | Search | "compare" opens /compare. | On |
| `command-retro` | Search | "retro" opens the RETROGRADE edition in a new tab, once `profile.links.retrograde` has its address. Until then Search doesn't know the word. | On, waiting for the address |
| `command-clarity` | Search | "clarity": the page goes soft, then comes back into focus from the pointer outward, over 1.2s. With reduced motion, one soft pulse in place. | On |
| `design-grid` | The site | G lays the grid over the page: its columns at the content width (12, or 8 on tablets and 4 on phones) and gutters, the 8pt baseline, rulers at 734, 1068 and 1440 (each the right edge of a window that wide), and a legend of what's showing. G again takes it away. | On |
| `focus-mode` | The site | F dims and softens everything but the section under the pointer, or the one with the keyboard's focus: whichever moved last leads. F again or Esc leaves. | On |
| `resume-edition` | The site | ⌘P prints a one-page résumé, on A4 or on Letter: the name, the email and the links, experience (each role's first two highlights), research, projects, skills, education and honors, and a QR code back to the site once `profile.links.site` has its address. There's no phone number in it. | On |
| `console-hello` | The site | The DevTools console shows one message a session: the monogram, "Hi, fellow engineer.", the GitHub link and the email. | On |
| `compare-page` | The site | /compare, "Compare Akshat models.": a column per year, each year its own picker, as Apple's compare pages have. The rows are what Akshat was studying, internships to date, papers, honors and what joined the stack that year, built only from dated entries: "Derived from dated entries; nothing estimated." Phones compare the latest two years, tablets three. | On |
| `not-found` | The site | The 404, "This page is out of focus.": the light and the name behind the words are blurred, and "Bring it into focus" sharpens them and goes home. The words themselves are always sharp. | On |

---

## 9. Voice

- **Rhythm.** Apple rhythm: short declaratives; fragment, fragment, payoff. For example: "Six documents. Two calls. Pennies a run.¹" Numbers are the heroes. No buzzwords, no exclamation marks, and sentence case throughout. *Open conflict: [C5](#c5-sentence-case).*
- **Person.** First person ("I") in the About and Contact sections; product voice in headlines. Anywhere else that refers to Akshat in the third person, use the name, not pronouns (Akshat hasn't specified them).
- **Footnotes.** Every number gets a footnote: a superscript that links to the note in the footer, with a ↩ link back.
- **Approval.** Copy in content stays a draft until Akshat approves it.

---

## 10. Budgets

- **Web vitals:** LCP under 2.0s on a mid-range phone over 4G · INP under 150ms · CLS under 0.05. LCP is measured with Lighthouse's mobile profile under DevTools throttling (see §12, Part 5). INP can only be measured in the field.
- **JavaScript:** first-load JS of at most 170 KB gzip on every route, a KB being 1,024 bytes as every part has counted. It's counted as `next build` counts it: every chunk the route's segments need and the ones every page shares (`lib/first-load.ts`). 3D, Ask and each section's behavior load as lazy chunks (`components/ui/behavior.tsx`).
- **Lighthouse:** performance at least 95; accessibility, best practices and SEO at 100. Measured on the home page, a case study and a paper, each page's median of three runs.
- **Held in CI:** every pull request runs size-limit on every route's first-load JS (`.size-limit.ts`) and Lighthouse CI on those three pages (`lighthouserc.json`), both from these numbers (`lib/budgets.ts`). /colophon states them beside what was last measured: the JavaScript from the build it's part of, and Lighthouse from its latest run (`content/measured.ts`, written by `npm run measure`), dated.
- **Frames:** whatever runs on scroll reads the page first and writes after, once a frame, through one scheduler (`lib/frame.ts`), so no frame forces a layout of its own making. Motion is driven by time or scroll, never by frame count, and is tested at 30, 60 and 120 Hz (`tests/unit/frame-rate.test.ts`).
- **3D:** only on capable devices (tier HIGH or MID), with posters everywhere else. It's one lazy chunk, fetched once a scene is three screens away, so it never competes with the first load or a visitor who never comes near (Part 17). The whole site uses one WebGL context, and nothing renders off-screen. HIGH draws at up to 2× the device pixels, MID at up to 1.5×. A governor watches the drawing: if frames stay slower than 24ms, on average over two seconds of continuous drawing, the stage gives way to posters for the rest of the session.
- **Accessibility:** WCAG 2.2 AA, with every contrast pair unit-tested. Anything that moves for longer than 5 seconds gets a pause control (WCAG 2.2.2). Every part gets a VoiceOver pass, along the path in `tests/a11y/WALKTHROUGH.md`, and axe reports nothing on any route in either theme.
- **Editions:** every edition is whole: phones, tablets, reduced motion, reduced transparency, increased contrast, forced colors, no JavaScript, print and a reader view. Playwright keeps visual baselines for 390, 820 and 1440 wide, light and dark, with motion and without.

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
- Anthropic's TypeScript SDK (`@anthropic-ai/sdk`) for Ask, on Claude Opus 5.5 by default.
- Tests: Vitest, Playwright, axe-core, size-limit and Lighthouse CI, which GitHub Actions runs on every pull request and on main (`.github/workflows/ci.yml`). Hosting: Vercel, with its Web Analytics, which sets no cookies.
- next/og for each page's share card and the monogram icons, drawn at build in the site's own tokens and faces.
- Security headers on every response, and a strict script policy: each prerendered page lists its own inline scripts by hash (`scripts/csp.ts`). Secrets live only in the environment (`.env.example`).
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
- **The date line renders in the browser** (Part 5; superseded in Part 18: the first screen has no date line). Only the browser knows the visitor's date and locale, so the server renders the place and zone ("India · IST", never a stale time) and the page stays static, with no `io()` in the shell. The live line arrives as a new element in a full-width box, so the swap shifts nothing.
- **The arrival is CSS from the first paint, and the name is never transparent** (Part 5). It only blurs and rises into place, so it paints, and counts as LCP, at once. The fades fill backwards: once over they leave no effect behind, so nothing stays a backdrop root and the dial's glass blurs what's behind it.
- **Hero text is white throughout** (Part 5; in Part 18 the role takes the finish's hues again, above the light's reach). fg-2 and accent-colored text fail over the light field, so the role, the headline, the date line and "Say hello" are fg. The discs are radial gradients capped at 22%, which keeps fg at 4.5:1 or more where all three overlap, in every finish and at every hour (tests/unit/contrast.test.ts).
- **The portrait's scrims assume a white wall** (Part 5). The real plate's color is unknown, so the top third, which holds the date line and the name, is dimmed evenly by .58, and the floor reaches .72 where the details begin. Both pass AA for white text over pure white.
- **The aperture's stops** (Part 5). Full stops ƒ1.4, 2, 2.8, 4, 5.6, 8, 11, 16 give 24, 16, 12, 8, 6, 4, 3 and 2px of blur. ƒ4 is the 8px the focus pull settles on, and ƒ1.4 the 24px it starts from. The head script restores the session's stop before the first paint. The dial isn't a `<label>`, which would make its whole face a button to the cursor.
- **The aperture's ƒ is drawn, not typed** (Part 5). Set in the serif italic, that one glyph made Chrome download two font files (237 KB) before the first paint.
- **The plate loads at half resolution** (Part 5). It's always blurred, so it needs no more. It also stops the plate, which is the subject's size, from taking the LCP from the subject, which is preloaded with fetchpriority="high". Every hero image loads eagerly, since Next 16's Image defaults to lazy.
- **The finish wipe** (Part 5). A View Transition whose new snapshot shows through a circle with a 72px soft edge, grown from the swatch on the in-out curve over 600ms (`--wipe-r` is registered so it animates). On ease-out the circle covered most of the screen within a quarter of the time. The swatch's own selection changes at once; the color follows.
- **The scroll cue rests for good** (Part 5; superseded in Part 17, the cue still, and Part 18, the cue gone and the first scroll no longer remembered). The first scroll is remembered in localStorage, and the head script sets html[data-scrolled], so the cue never breathes on a return visit.
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
- **The reel's pagination dots are 36×44 on phones** (Part 6). Seven 44-wide targets and the pause control don't fit at 390px. They're above WCAG 2.5.8's 24px, and swipes, the arrow keys and each card's + reach every card too. From tablets up they're 44×44. (Superseded in Part 15: 44×44 everywhere.)
- **Performance after Part 6** (Part 6). The new sections add 9 KB of HTML (gzip) and 7 KB of JavaScript: first-load JS is 162.6 KB, under the 170 KB budget. Under DevTools throttling performance is 0.99, LCP 1.5s and CLS 0; on localhost the simulated score fell from 0.96 to 0.94, for the reasons in the entry above. Best practices and accessibility stay at 1.0.
- **The edit's timeline comes before its viewer in the document** (Part 7). Tab reaches the clips before the panel they show, and the viewer sits above on screen. The panel on show comes last, and the others are inert, so its footnote marks are the only stops after the clips.
- **One footnote mark per note, per panel** (Part 7). A role's metrics are grouped by the footnote that backs them, and each group is marked once. The highlights carry no marks: the schema now checks that every number in a role's text is one of its metrics, so the marks beside the metrics cite them all. With one stop for the honors, the worst case is six clips, one honor, two marks and the press that leaves: 10.
- **The scroll isn't spent evenly on the time scale** (Part 7). On a real scale, WalkingTree's two months are 5% of the scroll and the two degree-only years are 60%. The picture keeps the real scale, but each role and the conference hold the viewer for the same scroll, and degree-only stretches pass at 0.03 of that per month, at most half.
- **Honors are markers** (Part 7). Their year brackets cover most of the scale, under the roles, so under the top-track rule they'd never show. They show when chosen (a click, focus or the arrow keys) until the playhead leaves their year, and choosing one springs the playhead to it.
- **The edit pins only where its tallest panel fits** (Part 7). That's 1069px wide and 760px tall: the viewer needs about 400px. The query lives once in a CSS variant and once in `lib/edit.ts`, and a unit test keeps them equal. Lanes grow with the screen's height (28–48px), so the timeline is about 40% at 900px tall. If a panel still overflows (with a large default font, say), the controller marks the edit `data-unfit` and it stays a stack.
- **The playhead follows the scroll exactly** (Part 7), like the statement's fill and for the same reasons. Clicks and focus travel on the smooth spring.
- **Playback scrolls the page** (Part 7). The scroll stays the one source of truth, so playing, scrubbing and the Island's links can't disagree, and the visitor's own scroll stops playback. A focused clip is chosen a frame later: the browser scrolls it into view after the focus event, and that scroll would otherwise stop the spring. In WebKit, a wheel tick that lands in the same frame as one of the edit's own scrolls can be lost; it still stops the motion, so from the next tick on the scroll is the visitor's alone.
- **The edit's counters count when a panel comes on** (Part 7), from zero, over `durations.count`. A visual's figures wait until the visual draws them (`--count-delay`). In the stack, and with reduced motion, they read as stated.
- **The edit's charts invent no data** (Part 7). Truechip's defect line drops by the stated ~30% on an unlabeled scale. WalkingTree's line rises to the stated level and holds, so it reaches 2,500+ without a history, and its bars are unlabeled skeleton bars, a UI idiom. EY's visual has no figures, since its role states none.
- **Clips are named by `experience[].short`** (Part 7), which the schema checks is part of `org`: EY, Truechip, WalkingTree. A name goes inside its clip when it fits, beside it when the lane has room there, and otherwise is left to the viewer. A clip's accessible name is always the full name, role and dates.
- **Clips are never wider than their dates** (Part 7). The padding belongs to the title, and a sliver's minimum is 6px. A clip that runs past today ends at "Now" and its fill fades there; a mask had also hidden its focus ring.
- **Until the browser knows today, the scale ends at the last date content knows has passed** (Part 7), EY's end. The HTML never claims a today; the browser extends the scale and adds "Now".
- **The surface crossfade is at most half a viewport** (Part 7, §4.2). The experience section is about four viewports tall, so its last 20% began while United was still pinned and dimmed it. Capped, the lights go down once the pin lets go. Sections shorter than 2.5 viewports keep their 20%; the statement's zone shrinks from about 470px to 450px at 900px tall.
- **The visuals' code labels use the system monospace** (Part 7). "app/", "layout" and "JWT" made Chrome, which has no `ui-monospace`, fetch JetBrains Mono (40 KB) at load for three decorative labels; on localhost the simulated LCP rose from 2.9s to 3.3s, and with the system face it's 3.0s. Safari draws them in SF Mono either way.
- **Performance after Part 7** (Part 7). The edit adds 3.1 KB of JavaScript (first-load JS is 165.7 KB, under the 170 KB budget) and 11 KB of HTML over the wire, half of it the section's share of the RSC payload. Under DevTools throttling performance is 1.0, LCP 1.5s and CLS 0; simulated on localhost it's 0.93 with LCP at 3.0s, for the reasons in the Part 5 entry. Accessibility and best practices stay at 1.0.
- **Truechip's "10+ modules" has no footnote** (Part 7). It's the only metric without a source. TODO(akshat) in content.
- **A paper's status reads "Accepted · Presented April 2026"** (Part 8), the brief's wording, everywhere it appears, the edit's conference panel included, so the site says it one way. It becomes "Published" once a DOI exists.
- **Citations cite what each paper is now** (Part 8). Until it has a DOI, APA 7 cites a paper presentation (dated by the conference's days, title in sentence case and italic) and IEEE "presented at"; with one, both cite it in the proceedings, with the DOI. BibTeX is an @inproceedings whose every field is a content field: author, title (acronyms braced, so a style that lowercases titles keeps "PM2.5"), booktitle, series, organization, address, month, year, keywords and, once it exists, the DOI. A unit test parses it back and compares each field with content. Sentence case keeps acronyms but would lowercase a proper noun; neither title has one.
- **Until content names co-authors, citations and Scholar's tags list Akshat alone** (Part 8). That's what content says, but it may not be the whole author list: `coAuthors` is a TODO(akshat), and it matters most before anyone cites these.
- **Conferences record their country** (Part 8). Both citation styles place a conference by city and country, and "Vietnam" is in the brief's own venue line.
- **Scholar's date is the presentation's until the proceedings are out** (Part 8). `citation_publication_date` is 2026/04/28; the optional `published` date, added with the DOI, replaces it, in the citations too.
- **The structured data is checked against schema.org itself** (Part 8). ScholarlyArticle, with the presentation as its PublicationEvent (SCI-2026, its dates, Swinburne Vietnam in Hanoi), Akshat's public profiles as `sameAs`, and the DOI, the series and the publication date once they exist. A unit test validates every type, property and value against an extract of the schema.org vocabulary (tests/fixtures/schema-org.json), and both pages passed validator.schema.org with no errors or warnings (2026-11-16). There's no `url` or canonical link: content doesn't know the site's address yet.
- **Related work is what a paper and a project share** (Part 8): a skill both name (skill evidence, §6.3's matching) or an idea in a short list (`THEMES` in `content/derive.ts`, which adds no facts, like the search vocabulary). The food-waste paper relates to Automated Resume Screening (explainable AI) and Predictive Customer Churn (machine learning); the PM2.5 paper to Churn. Each card says what it shares. To be confirmed with Akshat.
- **The illustrations' words are content; their shapes are code** (Part 8). The stops, the factors, the hints and the caption are in `content/data.ts`; the risk, the attribution, the temperature trace and the haze's level are illustrative shapes in `lib/research.ts`, never shown as numbers. An e2e test finds no digit in either illustration.
- **The haze doesn't loop, so it needs no pause control** (Part 8, §2 rule 4, WCAG 2.2.2). It moves only when the scroll or the handle changes the density, eases over a fraction of a second, and rests.
- **Both illustrations hold 60fps on a mid-range phone, or fall back to stills** (Part 8). The cold chain is SVG drawn by CSS from one variable. The haze is at most 220 soft sprites on a canvas at one device pixel per CSS pixel (sharper buys nothing on soft edges and fills four times the pixels), redrawn only on a change, and its chart moves by setting attributes, with no re-render. A watchdog times each transition; below about 40fps (and with Save-Data or reduced motion) every change is drawn at once, as a still. Measured on the production build in Chromium at 4× CPU slowdown (Lighthouse's mobile profile): stepping and dragging the haze, stepping the cold chain and scrolling through either chapter held 60fps, with no frame over 18ms. At 6×, a React-rendered chart dropped frames and the watchdog fell back to stills, as it should.
- **"Why?" opens on hover, focus or tap, and stays while the pointer is on it; Escape dismisses it** (Part 8, WCAG 1.4.13). Each stop also carries its factors as its accessible description. Over a stop the cursor is the plain dot: the panel is the feedback, and the hover platter covered the stop's name. On narrow illustrations "Why?" sits under the drawing.
- **The chapters pin where the edit does, 1069×760 and up** (Part 8): at 1069px wide a long title at title size, the TL;DR, the keywords and the actions need about 600px. If a card still doesn't fit (with a large default font, say), the controller marks the section `data-unfit` and the chapters stay a column.
- **The abstract card flips in one grid cell** (Part 8), so it never changes size, and its turning face hides edge-on, like the bento's tiles (Part 6). Escape flips it back from anywhere while it's flipped: Safari doesn't focus a clicked button, so after Copy focus may not be in the card. The citations' styles are radios that CSS reads, so the paper's page switches them without JavaScript; BibTeX is set in the system monospace, so no font is fetched for it.
- **An unknown paper is a real 404** (Part 8). The paper pages are prerendered, but with Partial Prefetching an unknown slug would get the route's shell, which starts streaming with a 200 and can only mark itself noindex. A Proxy (`proxy.ts`) answers 404 for any slug content doesn't have, from the raw content file. The page reads its slug before rendering, so it opts out of instant-navigation validation (`instant = false`); the chapters' title links prefetch their pages, so navigation is still immediate.
- **The home page has a meta description** (Part 8), `profile.headline`, for §10's SEO budget; a paper's page uses its TL;DR.
- **Search links to the paper pages** (Part 8). Only /work/[slug] still points at its home section, until Part 9 (below).
- **Research's markup is the server's; the browser only sets attributes** (Part 8), like the edit's and the statement's. The cold chain, every "Why?", the citations, the haze's final frame and the actions are rendered on the server, and small controllers flip the card, open a panel, copy, share and move the forecast. As client components they had brought the Button, the segmented control and their icons into first-load JS and put it at 172.3 KB, over the 170 KB budget; now research costs about 4.3 KB.
- **Button and SegmentedControl render from Server Components** (Part 8). Each attaches its handler only when there's one to call, so a Server Component can render them for a controller to wire up, and the segmented control's radios work without script.
- **Research's serif loads as the section approaches** (Part 8), Part 5's follow-up. Until the section is two screens away its titles are in the system's serif (`--font-serif-local`), so Chrome fetches no face at first paint; the swap happens out of sight. Without JavaScript they get the full stack. On localhost the home page's simulated LCP went from 4.1s (the italic face for "Research." had added 144 KB) to 2.6s, better than Part 7's 3.0s. Apple devices draw New York either way and never download it.
- **Performance after Part 8** (Part 8). First-load JS is 169.8 KB, 0.2 KB under the budget, so Part 9 has to pay for what it adds. The home page's HTML is 48 KB over the wire (14 KB more, half of it the section's share of the RSC payload). The home page scores 0.99 under DevTools throttling (LCP 1.5s, CLS 0) and 0.97 simulated (LCP 2.6s); the paper pages 1.0 and 0.93–0.94 (LCP 1.4s). Accessibility, best practices and, with the new description, SEO are 1.0 on all three.
- **The flagship is the first project, and every filter packs with no holes** (Part 9, §4.5). On desktop's square rows: the flagship 8×2 and the next tile 4×2 beside it, then rows of three 4×1 (one left over runs 12×1, two share a row at 6×1). A filter without the flagship gives two tiles 6×2 each and three 4×2 each. Tablets pack in sixes: the flagship 12×1, then 6×2 beside two 6×1, then pairs. `lib/bento.ts` packs first-fit and a unit test packs every count from one to nine on both.
- **A filter's places are the tile's, by the filter's position** (Part 9). Each tile carries its grid area under each filter as custom properties (`--lg2`, `--md2`, …) and the positions it shows under; CSS reads the checked radio (`:has()`), up to six filters like the segmented control. So the filter works without JavaScript, and the controller only animates it.
- **The reflow is a View Transition that never jumps** (Part 9). Each tile takes a name for the transition and glides on the smooth spring; the rest of the page doesn't crossfade, and clicks reach the real page. A second pick mid-flight hurries the running transition to its end (four times as fast) and then glides on: starting a new transition would snap the first to its end. With reduced motion, or without View Transitions, the grid changes at once.
- **On phones the filter is a row of chips** (Part 9). Five labels, "Accessibility" among them, don't fit a segmented control's equal segments on a 390px screen, so below 735px they scroll sideways as chips, the checked one filled. Their colors don't transition: when the surface controller starts, every section flips tone at once, and chips easing their text color sat in the old tone over the new track for 200ms, which axe caught on a busy machine. The track is an opaque mix of fg and the section's surface rather than the see-through control track, so it never shows the backdrop mid-fade.
- **A tile cites a note once** (Part 9), after its top metric, or else its tagline; Churn's "97% accuracy" carries ⁵ and its tagline, which says the same, doesn't repeat it. The metric itself counts up while the preview plays (drawn over the figure, which stays the text screen readers get), so the Churn preview draws only the ROC curve, its area exactly the AUC.
- **The previews play once and rest** (Part 9, §5.6). Hover or focus plays one; on a touch screen each plays the first time its tile is half in view. Nothing loops, so nothing needs a pause control. They're server-rendered SVG on one clock, `--work-film`, with no script beyond setting `data-playing`. Their words are content (`projects.*.preview`) and the schema checks each against the project's own text; the only figures are the ones it states. Chrome mixes a hex color into a `color-mix()` one through broken oklab values (yellow and red seats, midway), so the seats fade in by opacity.
- **A short tile sets its words smaller** (Part 9). A 4×1 tile's title, two lines of tagline and a metric left its preview a strip; under 26rem tall, the tagline drops to caption size and the padding tightens. Tiles wider than 1.6:1 set their words beside the preview.
- **The bento's behavior loads as the section approaches** (Part 9), like research's serif: the filter's reflow, the previews and the tilt are a lazy chunk (`lib/work-behavior.ts`) imported when #work is two screens away. Until then the filter still works; it's CSS.
- **A case study opens over the page as a sheet, from any page** (Part 9). The modal slot sits on the root layout, so a soft navigation to /work/[slug] from anywhere is intercepted: a paper's related work and Search open the sheet over the page they're on. Other routes match the slot's catch-all, which renders nothing, so the sheet closes on any other navigation. Interception needs the `Next-Url` header; a host or CDN that drops it gets the full page, which is the same case study.
- **Leaving the route is what closes the sheet** (Part 9). ×, Escape, the dimmed page and a downward drag all go back one step, as the back button does, so the URL and the sheet never disagree. The next project replaces the history entry, and a footnote moves within the sheet without one, so closing is always one step. Focus starts on the project's name, so a screen reader hears what opened, and returns to its tile; the page's scroll position is held and restored.
- **The sheet's motion is one state on one spring** (Part 9, `lib/case-sheet.ts`). The panel's clip, the title's and cover's offsets, the content's fade and the page behind are numbers between two ends, the tile and the open sheet, carried by the smooth spring. A new target starts from wherever they are, with their speed, so closing mid-expansion turns around rather than restarting. A drag moves the same state and lets go with the finger's speed. With reduced motion it only fades.
- **A closing sheet is a ghost** (Part 9). With Cache Components, Next.js keeps a page it leaves in React's `<Activity>`, hidden with `display: none`, instead of unmounting it. A modal `<dialog>` hidden that way would still make the page inert, so the sheet closes its dialog in a layout effect's cleanup, the moment its route goes, and a copy (beneath the cursor, at the overlay layer) flies back into the tile and scrolls back to its top on the way. A sheet replaced by the next project holds still as a ghost until the next one has grown over it.
- **The page behind scales to .94 on a black desk** (Part 9). The content layer, the surface backdrop and the 3D canvas scale about the middle of the screen, with corners rounded by a clip, while the dim fades in over them; scrolling is locked with `overflow: hidden` and a stable scrollbar gutter, so nothing shifts.
- **Instant-navigation checks and the modal slot** (Part 9). The catch-all slot made every dynamic page fail Next's dev-only instant-navigation check, though each page opts out; the catch-all renders nothing whatever the URL, so it opts out too (`instant = false`). The intercepted page can't opt out that way, so it reads its slug inside a Suspense boundary; it's prerendered for every project either way.
- **The diagrams are drawn top to bottom** (Part 9). Laid across, Cognivault's seven steps need 1,464px, past the content width; drawn down, every diagram fits a column beside its chapter's words, and the scroll that reveals it drives the drawing. `lib/architecture.ts` puts each box at the step of its longest path, and boxes without arrows (QuizMUJ's CSV bulk upload, analytics export and Docker) stand beneath as chips. Every box's words come from the project's text (the schema checks). The drawing is one registered variable, `--draw`, on a scroll-driven animation; without one (Firefox) it's simply drawn. Screen readers get the steps as a list.
- **The outcome is metrics or words, as the brief says** (Part 9): counted metrics with their footnote when a project has them, else its qualitative outcome. Churn shows 97% and 0.98, so its outcome sentence isn't shown. The outcomes are drafts worded only from each project's own text, and every problem statement is a TODO(akshat), so no case study shows "The problem." yet.
- **The fourth chapter is "Built with."** (Part 9): the stack as chips, each linking to the skills when it is one, and the code and live links once content has them. The next-project card shows the next project's category and name, not its tagline: a tagline's footnote can't sit inside a link.
- **Search links to the case studies** (Part 9). Every page now exists, so the pending-route indirection is gone; the proxy answers 404 for an unknown project too.
- **Performance after Part 9** (Part 9). First-load JS is 169.7 KB, 0.1 KB less than after Part 8: the bento adds only its 0.5 KB loader (its behavior is a 1.5 KB lazy chunk), and the tier's GPU check now loads with the first 3D view. The sheet, its motion and the case study's counters are a 10.6 KB chunk that loads with the first case study opened. The home page's HTML is 57 KB over the wire (9 KB more: the bento's tiles and previews, and their share of the RSC payload). The home page scores 0.99 under DevTools throttling (LCP 1.6s, CLS 0) and 0.96 simulated (LCP 2.8s, up from 2.6s with the heavier HTML); a case study's page 1.0 and 0.97 (LCP 1.5s and 2.5s). Accessibility, best practices and SEO are 1.0 on both.
- **The chip's layers are stylized, and content orders them** (Part 10). Top to bottom: the die, an interposer, the heat spreader, a routing layer, the package and the substrate. Which category each layer carries is `copy.skills.chip.layers`, which the schema keeps equal to the skill categories, each exactly once. The specs keep content's own order.
- **One projection, two editions** (Part 10). The poster (SVG) and the 3D scene (an orthographic camera; the chip turned 45° and seen from 30° above) both draw from `lib/chip.ts`. The exploded 3D chip lands exactly on the poster's view, and the DOM labels sit at the same corners in either. The view leaves room on the left for a layer sliding out.
- **Only the 3D chip has a scroll scene** (Part 10). Its stage is 230svh with a sticky frame; the poster is simply the exploded view, and reduced motion gets the poster, so it never pins (§5.7). The labels and the die's button wait until the chip has exploded, and tabbing into a label skips the scene to the exploded chip (§5.5).
- **The 3D chip is driven from the DOM** (Part 10). drei's View raycasts only events on its own element, so the labels and the die are DOM buttons over it; hovering a layer in 3D slides it too. The scene and the DOM share a small store (`lib/chip-state.ts`). Focus outranks hover: a label that scrolls under a still pointer doesn't take over from the one in focus.
- **Phones list the labels under the chip** (Part 10). Exploded on a 390px screen, the layers are about 25px apart, under the 44pt target (§2 rule 7); from 735px the labels sit at the corners.
- **The chip holds 60fps** (Part 10). Measured in WebKit with the Apple GPU at DPR 2, on an M5 Pro (faster than an M1 Air): scrolling through the stage, frames averaged 16.7ms with none over 19ms; sliding the layers and the ripple matched. Headless Chromium renders in software and gets the poster (tier OFF), as it should. An iPhone 12 hasn't been measured: Safari reports "Apple GPU" on every iPhone, so its tier rests on the frame-time probe.
- **The logos are one prerendered sprite** (Part 10). `/skill-icons.svg` is made at build time from Simple Icons' SVG files, for the slugs content names. Importing the package put all of its 3,000 logos into the server's source maps, where one path's digits looked like a phone number to the privacy test; inline logos would also have added their paths to the HTML and, again, to the RSC payload.
- **A monogram where Simple Icons has no logo** (Part 10): Java, SQL, Power BI, Excel, Oracle, Windows, AWS and the ideas (RAG, DSA). The rule: a short name as it is, else a short alias, else a leading acronym, else its initials.
- **Show me where's jump is in two places** (Part 10). The Island's activity is far from the specs in the tab order, so the same jump, and "Show all", follow the pressed skill. A role jumps to its panel in the edit, a project to its tile, a paper to its chapter. It lasts until Escape, "Show all" or choosing the skill again; the activity persists as long.
- **"Used in" is what the text names** (Part 10). Evidence is derive's `skillEvidence`: a role, project or paper whose text names the skill or an alias, as a whole term. So Python is used in Automated Resume Screening only; no other text names it, though FastAPI implies it. Content would have to say so.
- **The cloud keeps the plain cursor dot** (Part 10). The fisheye is the feedback; a magnetic platter on every icon, or the drag circle over the middle one, covered what the fisheye magnifies.
- **/specs prints as itself** (Part 10). Every other page prints the résumé edition (§6.3); /specs prints its own sheet, in the light tone.
- **Sections share one lazy loader for their behavior** (Part 10). `components/ui/behavior.tsx` imports a section's behavior once it's within two screens, from a registry: the bento's, the skills', and now research's too. Research's four controllers (the pins, the cards' actions, the haze and the cold chain) were React components that rendered nothing and were in first-load JS (3.5 KB); they're one lazy module now (`lib/research-behavior.ts`), on the home page and on a paper's page. The illustrations attach before the pins, so the first scroll position reaches them.
- **The 3D stage is asked for three screens ahead of the chip** (Part 10). Registered at load, the chip's view started the tier's probe and loaded three.js with the page, far above the section: blocking time rose from 60ms to 560ms, and the home page's score fell to 0.85. Now the poster stands in until the chip is three screens away; then the stage loads (240 KB of three.js, r3f and drei, on HIGH and MID tiers only) and the scene compiles its shaders off screen. The poster gives way to the scene only while the chip is off screen, so the editions never swap in view and the stage's height never changes under the visitor.
- **Performance after Part 10** (Part 10). First-load JS is 166.3 KB, 3.4 KB less than after Part 9: research's controllers moved to a lazy chunk, and the skills section adds about 0.5 KB (the chip's view and the Island's link). Its behavior is a 4.5 KB lazy chunk, and the logos are a 17.7 KB sprite, fetched and cached on its own. The home page's HTML is 72 KB over the wire (15 KB more: the skills section's markup and its share of the RSC payload; the poster's dot grids are tiled patterns). The home page scores 0.99 under DevTools throttling (LCP 1.6s, CLS 0, blocking time 40ms) and 0.96 simulated (LCP 2.8s); /specs 1.0 and 0.99 (LCP 1.4s and 2.2s). Accessibility, best practices and SEO are 1.0 on both.

- **The wallet stacks with its front at the top** (Part 11). As in Wallet: the pass in front shows whole and the others wait beneath it, each showing its kind and its name, so every pass reads in the stack; bringing one forward slides the rest down beneath it in content's order. The stack's height depends only on how many passes there are, so nothing around it moves when one comes forward. On the home page, with only Education, the stack is that one pass.
- **A pass turns over by a checkbox, and comes forward by a button** (Part 11). The ⓘ is a checkbox the CSS reads, so a pass turns over without JavaScript, as the work filter's radios do (§7.6); the face turned away hides at the midpoint, edge-on, and leaves the tab order with it. The stack's buttons exist only once the stack does. They're toggle buttons (pressed is the pass in front) in one tab stop with roving focus, so the arrows move and Enter chooses, as the brief has it; radios would choose on every arrow.
- **F turns a pass over only while one has focus** (Part 11). That's the exemption WCAG 2.1.4 makes for a single-key shortcut, so it works even with single-key shortcuts off; the pass handles the key first, so focus mode's F (§6.3) doesn't also fire. After F, focus moves to the pass's ⓘ, so VoiceOver says which side shows without an extra live region.
- **A pass's color is the finish's or the issuer's, never its logo** (Part 11). Education takes the finish's own gradient and certificates its other tones in turn; content can give a certificate its issuer's tone, and the schema rejects one that carries white type below 4.5:1. The contrast tests check every finish's tones.
- **Expiry is said only when it's known** (Part 11). The build can't know today, so it marks "Expired" only when the month is before the latest month content knows has begun; the browser marks the rest by the visitor's calendar. A pass that expires this month isn't called expired until the month is out.
- **The QR codes are made at build time** (Part 11), from each certificate's verify URL, with medium error correction and a quiet zone of four modules, as one SVG path in module units: no encoder reaches the browser, and the path's coordinates, written with commas, never look like a phone number. The unit tests decode each one back to its URL with jsQR.
- **The degree reads "Computer Science and Engineering"** (Part 11), as content has it; the brief's "&" is the same field.
- **Smart India Hackathon gets the rounded square** (Part 11). Its engraving is the longest, and the rounded square's field is the widest at its top and bottom, so its name sets largest there (the circle's would be about 15% smaller). The hexagon waits for the next honor. Both editions use the same layout (`lib/medals.ts`), which shrinks the name and the line until every letter fits inside the rim.
- **The medals' motion lives in the DOM** (Part 11). drei's View raycasts only events on its own element, so, as with the chip, each medal's button takes the drag, the click and the keys, and `lib/medal-motion.ts` (driven by time, so 60 and 120 Hz match) says where it is; the scene only draws it. At rest it's exactly on a face with no velocity, and no frame is drawn until the next touch.
- **One medal, one view, one studio** (Part 11). Each medal has its own drei `<View>`, so each follows its own box and the stage skips any that's off screen; all three reflect one studio, an environment map made once from light panels (as drei's Lightformers are) and kept per finish, and share their brushing and glint textures. Like the chip, they ask for the stage three screens ahead and swap stills for 3D only while off screen (`components/three/use-near-scene.ts`, shared with the chip now).
- **The medals wait for a still moment** (Part 11). Built as they came within three screens, mid-scroll, the three scenes cost six to eight frames of 50–70ms while the visitor scrolled through Skills. Now each swaps in only once the page has stopped scrolling for 220ms (`lib/quiet.ts`), one medal per quiet moment and only while it's off screen. A visitor who never pauses sees the stills, which is the same object; one who reads Skills, as most do, finds them 3D.
- **The medals hold 60fps** (Part 11). Measured on the production build in WebKit with the Apple GPU at DPR 2, on an M5 Pro: frames averaged 16.7ms with none over 20ms while each medal spun from a hard flick, while scrolling past all three in 3D after a pause in Skills, and on a brisk scroll from Work to Contact that never paused (the medals stayed stills). On LOW and OFF tiers they're stills; an iPhone 12 hasn't been measured (see the chip, Part 10).
- **A still's shapes are drawn once** (Part 11). Both faces of a still reuse its outline, rim and field through `<use>`, at one decimal: the section's markup fell from 92 KB to 26 KB.
- **Performance after Part 11** (Part 11). First-load JS is 166.7 KB, 0.4 KB more than after Part 10 (the medals' view and the quiet-moment helper; their scene, the QR encoder and the behavior are lazy or server-only). Lighthouse's mobile run, under DevTools throttling: performance 0.99, LCP 1.6s, blocking time 40ms, CLS 0, and 1.0 for accessibility, best practices and SEO. The home page's HTML is 82 KB gzipped.

- **The composer adapts a tested reference** (Part 12). `lib/contact.ts` follows the one in ~/Downloads/port: a pure `handleContact` that's handed its rate limiter and its transport, so the tests drive every path with fakes; zod/mini in the browser; and it fails closed. It drops that version's intents and its 2.5-second time trap: the brief asks for a honeypot, and a person who autofills and pastes can beat 2.5 seconds.
- **No keys, no relay** (Part 12). A production build without Resend's or Upstash's keys sends nothing and answers 503, and the page offers the mail app with the visitor's words. Development uses a console transport and a limit in memory, and `CONTACT_TRANSPORT=console` gives a production build the same, so the end-to-end tests deliver for real.
- **The limit counts the sender's address too** (Part 12): five an hour per IP and five per address, since a forwarded-for header is only as honest as its proxy.
- **LinkedIn's tile is a monogram** (Part 12). Simple Icons removed LinkedIn's logo at LinkedIn's request, so rather than draw a lookalike, the tile carries "in" in the site's own type, in the accent on a plain tile, as the skills cloud does for logos it doesn't have (Part 10). GitHub's mark comes from the same sprite as the skills.
- **Every ↩ is its own target, and numbered** (Part 12). Side by side, a note's back-links had 44pt hit areas that overlapped, so a tap on the first could land on the second. Now each takes 44pt of width, and a note cited three times reads ↩¹ ↩² ↩³, so the visitor knows which mention each goes back to. Case studies and paper pages share the change.
- **An error red for light surfaces** (Part 12). The system red falls under 4.5:1 for small text on light cards, so `--color-error` is #C5000F on light and the dark-mode system red on dark, tested like every other pair.
- **/colophon exists now** (Part 12). The footer's site map lists it, so it's built: a small sheet of how the site is made, from content, stating facts about the site, never about Akshat.
- **The live lines and the footer's settings load after the page** (Part 12). Both need the browser to show anything, so they're lazy chunks with their space kept; the settings sit at the very end of the page.
- **Performance after Part 12** (Part 12). First-load JS is 167.8 KB, 1.1 KB more than after Part 11: the footer's settings and the live lines load as lazy chunks after the page, and the dock's and the composer's behavior is a lazy chunk that comes in as #contact nears. Lighthouse's mobile run, under DevTools throttling: performance 0.98–0.99, LCP 1.6s, blocking time 90–110ms (40ms after Part 11: the settings' chunk and the lazy lines now hydrate in the window it measures) and CLS 0, with 1.0 for accessibility, best practices and SEO.

- **A surprise's flag is fixed at build time** (Part 13). Each is a constant in its own file (`lib/surprises/`), and `NEXT_PUBLIC_SURPRISES` can override any for a build. A flag read in the browser alone would render one page on the server and another after hydration.
- **The Devanagari name ships off** (Part 13), until Akshat approves it, as the brief has it. A build with `NEXT_PUBLIC_SURPRISES=+devanagari-name` shows it; the unit tests prove it works with its flag on. अक्षत is narrower than "Akshat", so it centers in the space the name keeps, and nothing beside it moves.
- **Hover-only delights are decoration** (Part 13), which resolves C1. A delight may live behind a hover only when it adds nothing that isn't already on the page, like the loupe or the dock's magnification. Every other surprise is behind a click or a key, as the brief's rule has it: keyboard-reachable or purely optional.
- **A secret command shows only when its whole phrase is typed** (Part 13). Matched fuzzily or as a prefix, it would spoil itself among the suggestions and turn up in ordinary searches ("hell" on the way to "hello"). Typed in full, it's the Top hit, so Enter runs it.
- **"retro" waits for its address** (Part 13). Content has no URL for the RETROGRADE edition yet (`profile.links.retrograde`, a TODO), so Search doesn't know the word and /colophon doesn't list it. Once content has the URL, both do, with no code change.
- **Every clock reads one time** (Part 13). The hero's date line, At a glance's Local time and the close's live line all read `clockTime()` (`lib/use-now.ts`), which is how "9:41" holds them all for five seconds. The date line had a ticker of its own; it shares the one clock now.
- **The clear sky is the visitor's** (Part 13). Only the handle taken all the way right by a drag or a key clears it; the scroll's play carries the handle to the horizon without clearing anything, and taking the handle back from the visitor also takes back the clear sky.
- **The clarity ripple is one masked layer** (Part 13). A fixed layer with a backdrop blur and a radial mask whose clear middle grows from the pointer, its radius set each frame; nothing in the page re-renders. Its clock starts on its first drawn frame, so a busy moment as Search closes can't skip the start. Playwright's WebKit doesn't draw backdrop filters at all, so the end-to-end test checks the layer's life (it appears, grows, never takes a click and goes) rather than its pixels; Chromium draws it.
- **Focus mode follows whichever moved last** (Part 13): the pointer, or the keyboard's focus. A scroll that moving the focus caused doesn't hand the lit section back to the pointer. An Escape that something nearer takes first, such as the dock's label, doesn't also leave the mode.
- **The grid's rulers are windows** (Part 13). Each of 734, 1068 and 1440 is drawn as the right edge of a window that wide, labeled along the bottom, clear of the Island; so the 1440 mark shows on a 1440 screen, at its edge.
- **The résumé is one page of A4 and of Letter** (Part 13). Each role keeps its first two highlights, research and projects are a line each, skills sit beside education and honors, and the margins are 12mm: Letter, 18mm shorter than A4, had spilled onto a second page. The end-to-end test prints both sizes in Chromium and counts the pages. The QR code waits for the site's address (`profile.links.site`, a TODO), and a date range never breaks at its dash.
- **/compare's years are content's** (Part 13): from the first dated entry (2023) to the latest month content knows has begun, so the build never guesses today, and a new year adds a column with no code change. Internships, papers and the stack put their count first, as Apple's compare pages do with a number; the rows' names are row headers, so each cell is announced with its row and its year. It's built ahead as a static page. It's indexable, as every page is (§10's SEO budget); only Search and /colophon lead to it, so it stays found rather than shown.
- **The 404's words are never blurred** (Part 13). The page behind them is: the light and the name. A blurred headline would be a page that can't be read. "Bring it into focus" is a link home, so it works without JavaScript; with it, the blur clears first, and with reduced motion it goes home at once.
- **The console's note and the clear sky say themselves once a session** (Part 13), in sessionStorage. Every other surprise happens only when the visitor does something, as often as they like.
- **The count-up counts in whole steps** (Part 13). Intl's default allows three decimals, so a count passed through numbers like "3.999 internships"; the Counter counts in the final value's own precision now.
- **Performance after Part 13** (Part 13). First-load JS is 168.9 KB, 1.1 KB more than after Part 12: the flags, the clocks' freeze, the page modes' shell and Search's pointer. Everything else a surprise needs is lazy: the grid's overlay and focus mode's tracking load the first time their mode is on, the console's note after the page, the name's morph through the behavior registry (`components/ui/behavior.tsx`), and Search's commands with Search. Lighthouse's mobile run, under DevTools throttling: the home page scores 0.99 for performance (LCP 1.6–1.7s, blocking time 50–80ms, CLS 0) and 1.0 for accessibility, best practices and SEO; /compare and /colophon score 1.0 in all four.

- **Ask is off until it's switched on** (Part 14). It generates only with `ASK_ENABLED=true` and `ANTHROPIC_API_KEY` both set, so a deployment without them never spends anything, and the switch alone turns it off again. Either way, Search still answers, from the site's own text.
- **Ask's endpoint runs on the default Node.js runtime** (Part 14). With Cache Components on, a route can't declare `runtime`, not even `"nodejs"` (Next 16, route-segment-config/runtime); POST handlers are never cached.
- **The documents are the site's own words** (Part 14), rendered from content once per process, in a fixed order, one per section or entity: about, each role, paper and project, skills, education, each honor and certificate, contact and the colophon. Contact says plainly that no phone number is published, so a question about one has something true to cite. Papers have a `short` name in content, for their chips.
- **The cached prefix is held to its bytes** (Part 14). The system prompt and the documents never change between requests, and nothing per request (no date, no id) comes before the question; the unit tests compare two questions' requests byte for byte up to the question. Above Claude Opus 5.5's 512-token minimum, a warm prefix bills at $0.20 per million tokens, a twentieth of the input price.
- **Effort is low, and thinking stays adaptive** (Part 14). Claude Opus 5.5 can't turn thinking off; effort `low` and "answer directly, without deliberating" keep it short, so answers start sooner. `max_tokens` is 2,048: room for that thinking and a 90-word answer, and a ceiling on what one answer can cost.
- **A declined answer is dropped** (Part 14). The server-side fallback retries a declined question on the model Anthropic recommends for its category; if the final stop reason is still `refusal`, the page discards what streamed and offers Contact.
- **Every claim carries its source's number; the chips are what you press** (Part 14). Cited spans aren't links, so the keyboard path through an answer is the chips alone, in the order the answer cites them.
- **Ask's glow is blurred after it's masked** (Part 14). Masked to the screen's edges and blurred in one layer, the band had a hard inner edge, because a filter applies before a mask; the ring is masked in a child and the layer around it blurred.
- **Without the model, Search answers from its own index** (Part 14). The ranking is the question's words, with Search's vocabulary and a few hints ("projects" means work, "touch" means Contact), across titles, keywords, subtitles and text; the index carries each entry's chip (`askSources`), so these answers link the same way the model's do.
- **The key caps in Search use the primary ink** (Part 14). Secondary ink on a cap's grey, over the glass above a light page, measured 4.06:1; it took Ask's shorter panel, floating over the hero's white letters, to show it.
- **Ask is tested against a stand-in for the Messages API** (Part 14). `tests/support/anthropic-mock.ts` answers with streamed messages in the documented shape (a thinking block, cited text blocks, then usage), so the unit tests run the endpoint through the real SDK and the end-to-end tests stream answers in the browser. `scripts/ask-eval.ts` asks twenty questions of a site with a real key: grounding, chips, length, pronouns, phone numbers and the prompt, time to the first words, cache reads and cost.

- **The reel's dots are 44×44 everywhere** (Part 15, superseding Part 6's 36×44 on phones). §2 rule 7 asks for 44pt, and so does the phone audit. Seven 44pt dots and the pause need 368px on one row, more than a 390px screen's 358, so on phones the pause wraps under the dots; at 430px they share the row, and from tablets up the pause keeps the reel's right edge. Under 360px the dots shrink rather than overflow.
- **The Island's sheet puts its actions at its foot** (Part 15). On a 390×844 phone the sheet's rows run from 60 to 370pt down, and Search and the theme sat in its top corner, the hardest reach for a thumb. They now share the bottom row with "Say hello". Focus and VoiceOver take the actions first, as the page orders them, then the sections; on screen the actions are a block below them, rather than the old back and forth with "Say hello" alone at the foot.
- **Every target is 44pt** (Part 15): the specs' skill buttons, the core six's "used in" links, a case study's stack chips, the related work's names and the footer's links; the hero's chips and the notes' ↩ rows sit far enough apart that neighbors' targets never overlap. Checked by hit-testing every control at 390 and 360 wide.
- **The page draws edge to edge** (Part 15): `viewport-fit=cover`, with `--spacing-page` keeping the side margins at the gutter or the safe area, whichever is wider. It's a token of its own because the gutter also spaces the grid's columns, which mustn't widen in landscape on a notched iPhone.
- **Touch shows the dock's names** (Part 15). Under a mouse they're the macOS dock's tooltips; touch can't hover, so they sit under each tile, as the Home Screen labels its icons (§2 rule 5).
- **The custom cursor follows any fine pointer** (Part 15): `(any-hover: hover) and (any-pointer: fine)`, so an iPad with a trackpad gets it, though its main pointer is a finger, and touch still hands over at once. Browsers can't emulate that mix of pointers, so a unit test answers matchMedia as each device would (`tests/unit/cursor-gate.test.tsx`).
- **The materials turn solid at their tokens** (Part 15). Search and the aperture dial read the glass tokens directly, past the material utility's fallback, so reduced transparency, increased contrast and forced colors now set the tokens themselves. With more contrast the hairlines go from 8% ink to 36%.
- **Forced colors say in system colors what fills said** (Part 15). Chromium forces every background to Canvas but keeps its alpha, so the glass stayed translucent and blurred, and every choice drawn only as a fill vanished: the checked segment, the current section, the selected result, the timeline's clip, the switches' thumbs and the reel's dots. Each choice is now the system's Highlight, out of the forcing (`forced-color-adjust: none`) so its text gets no Canvas backplate, and the shapes are drawn in the text color.
- **A clip's name starts with what it shows** (Part 15, WCAG 2.5.3). EY's clip shows "EY" and was named "Ernst & Young (EY), …"; it's "EY, Ernst & Young, …" now, so a voice command for what's on screen finds it. axe found nothing else on any route, in either theme, at either width, with motion or without.
- **The governor counts only drawing** (Part 15, §10). The stage draws on demand, so the time between two frames is drawing time only when the first asked for the second (a scene still moving); a frame after the stage's rest, or a hidden tab's pause, starts a new run. "Stays above 24ms" is the average over two seconds, so one quick frame doesn't excuse a slow run and one hitch doesn't condemn a quick one. Tested with fed frames, and end to end in WebKit with every frame made 40ms long: the chip gave way to its poster and the session's tier became LOW.
- **The chip's scene waits for a still page, and the page keeps its place** (Part 15). The scene's stage is 230svh and the poster about 520px, so the swap, which waits for the chip to be off screen, grew the page by some 1,550px above whatever was in view. In WebKit the Island's travel to Credentials landed, and then the heading dropped a screen and a half away: the browsers' scroll anchoring caught the change only some of the time. The swap now waits for a still page (`lib/quiet.ts`), and when an edition changes the height of something above the viewport, the page measures how far that element's bottom edge (and so everything below it) moved, after whatever anchoring the browser did, and scrolls back exactly that much, so it's never done twice. Tabbing into the chip skips its scene at once, too: a smooth scroll still running as the keyboard moved on carried the page away from the next stop.
- **The chip measures its scene against its sticky frame** (Part 15), not the window, which iOS Safari grows and shrinks with its toolbar, nudging the scene as the toolbar hid. The statement, the edit and the chapters already did.
- **Without JavaScript the address shows** (Part 15). The brief allows a form that posts or the email shown. Posting would mean the endpoint taking cross-site form posts, which it refuses by design (`lib/request-guard.ts`), so the form gives way to "Write to me at …", the address as a link to the mail app.
- **A reader view gets the résumé** (Part 15). Safari's Reader can't be driven headlessly; Firefox's Readability, the same lineage of heuristics, run in WebKit on the live page with what isn't rendered removed, stands in for it. It found words run together where only styles kept them apart ("6documentation artifacts"), so the pieces have a space between them now, unseen in flex and grid (`tests/unit/reader.test.tsx`); the edit's hidden panels missing, so they're transparent and inert rather than unrendered; and both papers dropped as link-heavy teasers, so each is an h-entry with its name, summary, link and keywords, which reader heuristics also take for content. The timeline's scale and the playhead's date only echo the clips' own dates, so they're hidden from assistive tech, and so from readers. Still missing: five of the seven highlights (lines too short for a reader to keep) and the skills' lists (they open on hover or tap); both are said in Experience and on /specs.
- **Tapping the Island's bar closes what it opened** (Part 15). The open panel, which arranges itself around the bar, lay over the toggle and took the tap; Chromium closed anyway, because focus left the button, but Safari doesn't move focus on a tap, so on an iPhone only a tap outside closed the sheet. Open, the bar sits on top of the panel now.
- **Without JavaScript, a phone's Island sits above the hero, not over it** (Part 15). Open, it's the phone's tall sheet, and laid over the hero it hid the name and the date for good, since both scrolled away together. From 735px up it's a slim bar above the hero's words, so it still floats there.
- **Tab reaches only the reel's card in view** (Part 15). Its + already was alone; its footnote marks follow now, so Tab no longer walks into cards off screen. The arrow keys move between cards.
- **The walkthrough is written down** (Part 15): `tests/a11y/WALKTHROUGH.md`, the path through the site with the keyboard and with VoiceOver on macOS and iOS. Its keyboard part runs by itself in WebKit and Chromium (`tests/e2e/walkthrough.spec.ts`): the order, a ring on every stop and nothing under the Island. The specs keep a Tab stop per skill, as Part 10 decided, 67 of them; the walkthrough says how to get past them.
- **Visual baselines are Chromium's** (Part 15). It renders in software here, so the 3D is always its posters, and with the clock fixed the pictures repeat exactly: six sections at 390, 820 and 1440, light and dark, with motion and without (`tests/e2e/visual.spec.ts`).
- **Measured first** (Part 16). Lighthouse's mobile run under DevTools throttling had every route at 0.99–1.0 for performance and 1.0 for the rest, so the work went where a trace showed time: scrolling. A full scroll of the home page forced 1,464ms of synchronous layout in twelve long tasks, from handlers that wrote a style and then read the layout back.
- **Scroll work reads before it writes** (Part 16). The island's progress, the hero's scroll-out, the edit, research's chapters, the chip's stage and the surface controller schedule their reads and then their writes once a frame (`lib/frame.ts`), and each caches what only a resize changes. The statement keeps its writes in the scroll event itself: its fill has to be right in every callback of the frame, and it restyles only its own words. Forced layout fell to about 680ms in three long tasks, most of what's left the cursor's `elementFromPoint`, which §2 rule 3 keeps exact.
- **Only the sections near the viewport take the lighting** (Part 16). The surface's tone rules restyled every section on each change; they now apply to sections within half a screen and to the pair the light is crossing between (`data-surface-near`). The edit's playhead and the chapters' `--play` are set on the one element that reads them, not on the section, which restyled every panel with every frame of a scrub.
- **3D is one chunk, fetched on the first touch or after ten idle seconds** (Part 16; superseded in Part 17: fetched as a scene approaches). The brief's "on idle" first meant the first idle moment after load, and the chunk's 116ms of parsing then landed in the load's own window: blocking time rose to 110–130ms. Now it waits for the first pointer, key, wheel or scroll, or ten quiet seconds, on HIGH and MID only, and blocking time is back to 15–40ms. The chip's and the medals' scenes are in the same chunk (`components/three/bundle.ts`), so the second scene costs nothing.
- **GSAP and SplitText register once** (Part 16), the first time a Resolve needs them, and every Resolve after shares the same promise (`components/ui/resolve.tsx`).
- **The edit's behavior loads with its section** (Part 16), as research's and the skills' have since Part 10. It was a React component in first-load JS (3.1 KB); now it's a lazy chunk (`lib/edit-behavior.ts`), and `Behavior` passes it what only the server knows: its clips and Akshat's time zone. CSS decides whether the edit pins, so the page's height is the same before it arrives. A jump into the edit from elsewhere, Show me where's or an Ask source's, has the behavior load at once rather than wait for the section to come near (`lib/behaviors.ts`).
- **First-load JS counts what Next counts** (Part 16). Earlier parts summed the home page's script tags; `lib/first-load.ts` reads the build's manifests as `next build` does for its route table, every route, and the end-to-end tests check that it lists the same files as Next's own record (`.next/diagnostics/route-bundle-stats.json`, which Next writes too late for /colophon to read). It's 167.2 KB on the home page, 1.9 KB less than after Part 15 (169.1 KB, counted the same way).
- **Any image route costs every page 0.45 KB** (Part 16). With an `opengraph-image`, `icon` or `apple-icon` file, Turbopack adds its async-module support to the runtime every page loads, though no client code uses it, and splits Next's router chunk (+0.55 KB on the home page in all). The share cards and icons are worth it, and moving the edit's controller out of the first load paid for them several times over.
- **The site's address** (Part 16) is content's domain once there is one (`profile.links.site`), else Vercel's production address, else localhost (`lib/site.ts`). Every page has its own title, description, canonical address and share card; the sitemap lists every page and robots allows everything but `/api/`.
- **Share cards and icons are drawn at build** (Part 16) by next/og, from the tokens in `styles/tokens.css` and Inter and Newsreader as files (`@fontsource`, since its renderer reads no woff2): the dark ground with the contrail finish, the Island's pill with the monogram, the page's name or title large, and "name · role" with the host. A paper's card is in the serif. The icon is the monogram, white on black, at 32, 192 and 512, and edge to edge at 180 for iOS, which rounds it; Next's default favicon is gone. They read their files at module scope, so every one is prerendered.
- **JSON-LD names one Person** (Part 16): Akshat on the home page, with title, employer, school and the LinkedIn and GitHub profiles; each project a CreativeWork and each paper a ScholarlyArticle (Part 8's, given its own address), each naming that Person by `@id` as its author. Nothing carries a telephone, and a test fails on anything shaped like one.
- **A strict script policy without nonces** (Part 16). A nonce needs every page rendered per request, which would end the static shell (§11). Instead each prerendered page gets a policy of its own in its head after the build: scripts from this site, and its own inline scripts by hash, the theme's, Turbopack's and React's payload (`scripts/csp.ts`). The header policy covers the rest (images, fonts, connections, frames, forms, objects, base) and allows inline scripts, since a browser enforces both and the strict one holds. Checked on every page in WebKit and Chromium: everything hydrates, nothing is blocked, nothing is fetched from another origin, and a script or handler slipped into the page doesn't run (`tests/e2e/findable.spec.ts`).
- **Analytics count moments, never words** (Part 16). Vercel's Web Analytics sets no cookies and loads after the page, only on Vercel. Besides page views it hears four events: a section reached (once each), a case study opened, a message sent and Ask used. None carries what was typed or asked. Events beyond page views may need a paid Vercel plan; that's for Akshat to check.
- **Screenshots resolve from blur placeholders made at build** (Part 16, §5.4): a 16px copy of the picture, inlined, which next/image shows blurred until the picture arrives (`lib/blur.ts`). No screenshot exists yet, so it's tested on a generated picture. The hero's portrait has its own focus pull from blur (Part 5).
- **The colophon states what was measured** (Part 16): the stack, the faces, the cursor's rules, the privacy and security rows, the budgets with this build's JavaScript and Lighthouse's latest run, the accessibility statement and the things to find. The statement claims only what the tests check; VoiceOver isn't in it until the walkthrough has been walked on a Mac and an iPhone. Lighthouse's numbers say where they were measured: until the site is live, on a production build.
- **CI runs where the baselines were made** (Part 16). The end-to-end tests and the budgets run on macOS 26 runners: the visual baselines are Chromium's on macOS with the system's faces, and Lighthouse throttles the CPU by a fixed factor, so a slower runner would fail the budget for its own speed. Types, lint, unit tests and the scan of the whole git history for phone-shaped numbers (`scripts/scan-history.ts`) run on Linux.
- **Lighthouse 13** (Part 16). Lighthouse CI brings Lighthouse 13.6, where earlier parts ran 12.x; the same pages scored the same.
- **Performance after Part 16** (Part 16). First-load JS is 167.2 KB on the home page, 155.5 KB on a case study and 150.2 KB on a paper. Lighthouse's mobile run under DevTools throttling, median of three: the home page 0.99 (LCP 1.7s, blocking time 39ms, CLS 0), the Cognivault AI case study 1.0 (LCP 1.5s, 15ms, 0) and the food-waste paper 0.99 (LCP 1.6s, 30ms, CLS 0.016, the TL;DR's face arriving); accessibility, best practices and SEO are 1.0 on all three. The home page's first long task is still the style and layout of its 2,700 elements, about 200ms at 4× throttling.
- **A panel reviewed the production build** (Part 17): an Apple HI designer, an apple.com web designer, an accessibility engineer, a performance engineer and a recruiter with 30 seconds, in Safari (WebKit) at 1440, 1024 and 390, light and dark, with motion and without. The 15 fixes with the most impact, and what's still open, are in `CRITIQUE.md`, issue by issue, with before and after.
- **The light changes in the gap between two ideas, and never stops halfway** (Part 17, §4.2). Crossfading over the last fifth of a section, up to half a viewport, left both sections' text on mid-gray for 240px of scroll at four of five changes, down to 1.2:1 for secondary text, and a visitor who stopped there stayed there. The crossfade now spans the outgoing section's bottom padding (a quarter of a viewport where there's none); at rest partway, it settles to the nearer end. A journey (the Island's, Search's, a jump) holds the light and changes it once on arrival: travelling down the page had strobed it dark, light, dark, light in a quarter of a second.
- **The hero names the role at the company** (Part 17). "AI & ML Engineer" over "Now at United Airlines" read as that title at United, where content says "AI & ML Intern (Generative AI)". The chip is "AI & ML Intern at United Airlines", and it jumps the edit's playhead to that role instead of landing on 2023. The JSON-LD's job title, read with its employer, is the current role's too. `profile.role` stays Akshat's own line.
- **A paper says who presented it until content knows who wrote it** (Part 17; supersedes Part 8's "citations and Scholar's tags list Akshat alone"). With `coAuthors` unknown, listing Akshat alone claimed more than content does. The byline is "Presented by Akshat Sharma", Cite waits until every author is known (a citation names them all), and Scholar's tags leave the authors out, since Scholar takes them as the whole list.
- **The date line is Akshat's day** (Part 17; supersedes Part 5; superseded in Part 18: the first screen has no date line). The visitor's date beside Akshat's time read as Akshat's day, and was a day out for half the world: "Wednesday … 10:50 AM IST" on a Thursday in India. Both halves are Akshat's now, in the visitor's locale.
- **The highlights say whose they are** (Part 17). Each card names its subject over its words, from its reference in content: the company, the project, the honor, or the section. "97% accurate." alone said of what.
- **"84% through B.Tech CSE"** (Part 17). An unlabeled share beside a degree read as a grade.
- **Headlines are typeset** (Part 17, §4.4): a no-break space keeps a dash to the word before it in every headline, and the last two words together where the measure holds them, the hero's headline and the statement (`lib/typeset.ts`); the statement's gradient phrase holds one line. `text-wrap: balance` alone still left "everyone." on a line of its own in WebKit, and lines starting with "—" on phones. A pair wider than its column overflows it instead: Contact's "something clear." did at 1440, so its "clear." stays alone until the column is wider. The Resolve splits words on plain spaces only, so the split lines are the final lines and nothing reflows when it reverts. A reel card's words are at most a twentieth of the card beside its film.
- **Focus always shows** (Part 17, §6.4). At a glance's flip tiles clipped their buttons' rings, so the tile wears the ring; the chip's die, invisible until the chip explodes, skips the scene to the exploded chip when it takes focus, as the labels do. Every page starts with "Skip to content" (WCAG 2.4.1), past the Island's eleven stops.
- **Search keeps what's typed while it opens** (Part 17, §6.3). Its code loads on the first open, and until the field was there, the first keystrokes were lost and G and F fired the grid and focus mode. They're held for the field now, and while the index loads it says "Searching…", never "No results".
- **A short viewport doesn't pin the chip** (Part 17). At 200% zoom (640×450) the sticky chip and its labels outgrew the screen and covered the core six's links at 13 of 20 scroll steps. Under 600px tall it isn't pinned, and shows exploded.
- **Scrubs move by the compositor** (Part 17, §10). The edit's playhead is a layer moved by `translate`, not `left`; its month label, the edit's counters, the statement's fill and the chapters' play are written only when they change. At 4× CPU a full scroll misses 14% of frames, down from 28%, and forces 821ms of style and layout, down from 1,495ms.
- **3D is fetched as a scene approaches** (Part 17; supersedes Part 16's first touch). Three screens ahead, when a scene's view registers, so a visitor who never comes near never fetches its 270 KB, and its evaluation no longer lands in the statement's scrub.
- **Newsreader is two static faces** (Part 17). The serif is set at 400 alone, roman and italic, and the optical-size axis cost Chrome 279 KB for a few titles; a paper's page now fetches 22.5 KB.
- **The dock offers the résumé** (Part 17, §7.9). Until a phone-free PDF exists, its Résumé tile prints the page's résumé edition, which is phone-free already, so it needs JavaScript and is hidden without. A recruiter looking for a résumé found only "Print any page" among the things to find.
- **Section headings sit on the content grid** (Part 17): Highlights' and Research's moved there from the wide container, and the reel's first card sits under its heading. About stays wide: its bento's tiles keep fixed shapes, and on the content grid they were too small for their words. The edit's timeline and viewer, and research's chapters, are scenes and stay wide.
- **Nothing outside a scroll scene runs past 900ms, or loops at the screen's foot** (Part 17, §5.3, §2 rule 4). The count-up is 900ms, from 1.2s, so no animation outside a scrub is slower than a reveal; the hero's scroll cue is still, where it breathed every 4s at the foot of the screen and restyled the page 60 times a second while it did.
- **A transition never takes a click** (Part 17). The theme's and the finish's View Transitions let clicks through to the page, as the work filter's did, so a second choice mid-wipe isn't lost.
- **Performance after Part 17** (Part 17). First-load JS is 168.0 KB on the home page (0.8 KB more: the type-ahead, the journey hold, the jump from the hero, the skip link). Lighthouse's mobile run under DevTools throttling, median of three: the home page 0.99 (LCP 1.7s, blocking time 17ms, CLS 0), the Cognivault AI case study 1.0 and the food-waste paper 1.0 (CLS 0.017, its TL;DR's face arriving); accessibility, best practices and SEO 1.0 on all three.
- **The landing page is "Into focus"** (Part 18). Akshat found the first screen ordinary and asked for one exceptionally modern, worthy of an Apple selection. Its drifting discs read as any gradient backdrop, and it said a lot in small type: a date line, three chips, four named swatches, a cue and a pause button. Now it has one idea, the headline's: two dot grids out of register slide into one as the name comes into focus, complexity turned to order, and then the screen holds still. Its first screen is the name, the role and the headline, two ways on, and the key facts at its foot (§7.1).
- **The first screen says nothing about where Akshat is** (Part 18; supersedes Part 5's and Part 17's date line). Akshat asked: "don't put my location". The date line ("Monday, November 16 · 7:00 PM IST", or "India · IST" without JavaScript) is gone, and no country, city, time zone or clock is on the first screen, for screen readers either; a test checks. The light still warms with the hour, the visitor's own. Further down, At a glance's Local time and the close's clock still read "IST", and the footer's credit says "in India": those wait for Akshat's word.
- **The key facts are a spec row** (Part 18, after Part 6's "Key facts"). Chips with "·" inside read as tags; a label over a value reads as a spec, as product pages set theirs: Now, Studying, Presented. Each link reads as one phrase, its label first. The columns narrow and the values take two balanced lines where the row is short of room, so the row fits from 735px up, where the chips' row had run off both edges.
- **The finish is four dots and a name** (Part 18). Its four labels were the widest thing on the first screen. The chosen finish's name sits beside the dots, picked by `html[data-finish]`, which the head script sets before the first paint, so it's right before anything hydrates. The dots' 44pt targets touch, so they read as one control, and their row takes a value's line: the label sits on the facts' line and the dots center on their values. The chosen dot's ring is white over the light; focus keeps its own.
- **Nothing on the hero loops, so it has no pause button** (Part 18; supersedes Part 5's 20s drift and its pause, WCAG 2.2.2). The light is still, the cue is gone (the facts end the screen), and the arrival is over in 1.2s. Without a loop, there's nothing to rest off-screen or in a hidden tab either, and the first scroll, which stopped the cue's breathing until Part 17, is no longer kept in localStorage.
- **Every word in the light's reach is white** (Part 18, after Part 5). The role's two hues pass on black (6.96:1 and up), not where the glows meet (2.1:1), so the light rises no higher than about half the hero, and a test checks that the role sits above it at 1440×900, 1024×768, 1280×600 and on a phone. The facts' labels and the finish's name are white, smaller and bolder than the values, since fg-2 falls to 2.0:1 where the glows meet.
- **Sections allow the surface controller's head start** (Part 18). It sets `data-surface-near` before React hydrates, which `next dev` had reported as a mismatch since Part 16; `Section` suppresses the warning for its own attributes only.
- **The end-to-end ports can move** (Part 18). Another app held 3100 here; `E2E_PORT`, `E2E_DEV_PORT` and `E2E_MOCK_PORT` move the test servers without editing the config.
- **The hero answers the visitor** (Part 19). Akshat asked for a better design with better transitions and animation, like a pro Apple designer, and dynamic, on a screenshot of Part 17's first screen. That was an old tab; Part 18 was already on the link. "Into focus" keeps its idea, and still moves on its own only as it arrives (§2 rule 4); now it answers what the visitor does (§5.6). The arrival ends with a glint across the name; a mouse lights the dots under it and draws the glint along; scrolling away tilts the field back into a floor as the name recedes.
- **The glint is drawn on a copy of the name** (Part 19). The name's lines carry their own backgrounds, for each line's focus pull, so a band across them would start again at each word. The glint is the name again, in the heading's generated content (`attr(data-glint)`, two lines on phones), laid exactly over it and clipped to its letters. Its alternative text is empty, so nothing reads or finds the name twice, and the loupe's copy of the heading, outside the hero, has none. Its place is a registered custom property, `--hero-glint-x`, so the arrival sweeps it in CSS from the first paint and the controller springs it under a mouse. The sheen falls to 64% at the foot of each line, from 74%, so the band has something to brighten; large text keeps 8:1 on black.
- **The lit dots need no measuring** (Part 19). The pool is a 400px layer moved by `--px` and `--py` in its container's own units (cqw and cqh), with its dots offset by the same amount, so they stay on the field's pitch: a transform and a small repaint each frame, never layout. Only a mouse lights it (`data-pointer`).
- **The scroll-out is done when 60% of the hero has gone** (Part 19), not all of it. Over the hero's full height, its tilt and recede played mostly off screen. The field fades by 55% of the way, not all of it, so its tilt can be seen.
- **The UI arrives in turn** (Part 19). The two ways on, then each key fact 30ms apart, then the finish, rising 10px as they fade in, onto a rule that draws out from the middle. The last is done at 1.19s; the glint, at 1.2s.
- **Performance after Part 19** (Part 19). First-load JS is 166.6 KB on the home page, 0.2 KB more: the glint's spring and the pointer's pool. Lighthouse's mobile run under DevTools throttling, the home page, median of three, on the same machine as Part 18's measurement: 0.98 (LCP 1,702ms, blocking time 137ms, CLS 0), as Part 18's 0.98 (1,712ms, 133ms). Painting takes about 60ms more, as the glint repaints the name while it crosses it once. Accessibility, best practices and SEO are 1.0.
- **Performance after Part 18** (Part 18). First-load JS is 166.4 KB on the home page, 1.6 KB less: the date line, its formatter and the pause are gone. Lighthouse's mobile run under DevTools throttling, median of three, against Part 17's build on the same machine while another project's tests ran, so both are slower than Part 17's quiet run: Part 17 scores 0.97 (LCP 1,668ms, blocking time 153ms), Part 18 0.98 (LCP 1,712ms, blocking time 133ms, CLS 0). Style and layout are the same (806ms and 808ms). The first screen settles sooner, since nothing drifts (Speed Index 2.45s, now 1.92s), and the name paints 45ms later, with the dot field in its first frame. Accessibility, best practices and SEO are 1.0. The colophon states Part 17's quiet run (19 November) until the next quiet one.

---

## Open conflicts

Each entry is a pair of rules that can't both hold as written. They are deliberately left unresolved. An entry stays open until a decision changes the rules it names, and that decision and its reason go in §12. C2, C4, C6 and C7 were resolved that way in Part 2, C3 in Part 4 and C1 in Part 13.

### C5. Sentence case

- **§4.4, §9:** sentence case everywhere and throughout.
- **§3.1, §3.2:** the section "Research & Publications" and the "Tech Specs" page are in title case (compare "Credentials & honors").
- **Clash:** as written, both names break the rule.

