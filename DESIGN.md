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
7. [Signature moments](#7-signature-moments)
8. [Surprises](#8-surprises)
9. [Voice](#9-voice)
10. [Budgets](#10-budgets)
11. [Stack](#11-stack)
12. [Decision log](#12-decision-log)

- [Open conflicts](#open-conflicts): [C1](#c1-hover-only-delights) · [C3](#c3-single-key-search-shortcut) · [C5](#c5-sentence-case). C2, C4, C6 and C7 were resolved in Part 2 (§12).

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
7. **Accessibility is design** (§10). WCAG 2.2 AA, targets of at least 44×44 pt, a full keyboard path and VoiceOver testing. *Open conflicts: [C1](#c1-hover-only-delights), [C3](#c3-single-key-search-shortcut).*
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
| 2 | Statement → About + At a glance | `#about` | dark → light |
| 3 | Highlights reel | `#highlights` | light-alt |
| 4 | Experience | `#experience` | light |
| 5 | Research & Publications | `#research` | dark (the lights go down) |
| 6 | Work | `#work` | light-alt (the lights come up) |
| 7 | Skills | `#skills` | dark |
| 8 | Credentials & honors | `#credentials` | dark |
| 9 | Contact | `#contact` | light |
| 10 | Footer | none | light-alt |

Credentials & honors holds education, certificates and achievements. It comes right after Skills and right before Contact.

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

A living black pill at the top. It is the nav, the section indicator, the scroll progress and the place where every confirmation appears.

### 6.3 Search

Opened with ⌘K or "/". Search everything, jump anywhere and run actions.

*Open conflict: [C3](#c3-single-key-search-shortcut).*

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

- **Web vitals:** LCP under 2.0s on a mid-range phone over 4G · INP under 150ms · CLS under 0.05.
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

---

## Open conflicts

Each entry is a pair of rules that can't both hold as written. They are deliberately left unresolved. An entry stays open until a decision changes the rules it names, and that decision and its reason go in §12. C2, C4, C6 and C7 were resolved that way in Part 2.

### C1. Hover-only delights

- **§2 rule 5:** no content that only hover reveals.
- **§8:** every section hides one delight "behind a click or a hover".
- **Clash:** a delight behind a hover alone is content that only hover reveals. It would also be missing from the full keyboard path (§2 rule 7).

### C3. Single-key Search shortcut

- **§6.3:** Search opens with ⌘K or "/".
- **§2 rule 7, §10:** WCAG 2.2 AA.
- **Clash:** "/" is a single-character shortcut. WCAG success criterion 2.1.4 (Character Key Shortcuts, level A, so required for AA) requires such a shortcut to be possible to turn off or remap, or to be active only while its component has focus. The brief specifies no off switch or remapping, and a global "/" isn't scoped to focus.

### C5. Sentence case

- **§4.4, §9:** sentence case everywhere and throughout.
- **§3.1, §3.2:** the section "Research & Publications" and the "Tech Specs" page are in title case (compare "Credentials & honors").
- **Clash:** as written, both names break the rule.

