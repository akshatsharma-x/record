# Keyboard and VoiceOver walkthrough

The exact path through the whole site with the keyboard and with VoiceOver (DESIGN.md §2 rule 7, §10; Part 15). Walk it in Safari on macOS, then in Safari on iOS, on the production build (`npm run build && npm run start`), after any change to markup, focus or motion. Each step says what to press and what must happen; anything else is a failure to fix before merging.

`tests/e2e/walkthrough.spec.ts` walks Part A by itself in WebKit and Chromium: the order of the stops, a visible focus ring on every one, and nothing covered by the Island. It can't listen to VoiceOver, so Parts B and C need a person.

## Before you start

- **Safari on macOS.** Settings → Advanced → turn on "Press Tab to highlight each item on a webpage". Without it, Tab reaches only form fields and Option-Tab reaches everything; the tests press Option-Tab in WebKit for that reason.
- **VoiceOver on macOS.** ⌘F5 starts and stops it. VO means Control-Option. Turn Quick Nav off (Left and Right arrows together) so the arrow keys reach the page.
- **VoiceOver on iOS.** Settings → Accessibility → VoiceOver, or triple-click the side button if the shortcut is set. Set the rotor (two fingers, turned like a dial) to include Headings, Landmarks, Links and Form Controls.
- **Start state.** A fresh private window, so the session's choices (the tier, the reel's pause, the theme) start clean. The page at the top, the pointer outside the window.

## Part A: the keyboard, in Safari on macOS

Tab moves forward and Shift-Tab back. At every stop the 3px accent ring shows around the focused thing (§6.4), the thing is in view, and the Island never covers it.

### The home page, in Tab order

1. **The Island**, 11 stops. The first Tab lands on the Island's toggle, "Overview, sections, button, collapsed". Focus expands it (§6.2).
   1. The toggle. Enter or Space toggles it; Escape collapses it and keeps focus on it.
   2. Search. Enter opens Search (see "Search and Ask" below).
   3. The theme toggle, "Use the dark theme" (or the light one). Enter switches; the Island says so.
   4. "Say hello". Enter goes to Contact, and focus moves to its heading.
   5. to 11. The seven section links, the current one marked (`aria-current`). Enter travels to the section and moves focus to its heading, which sits below the Island.
   - Tab past Contact: the Island collapses as focus leaves it.
2. **The hero**, 7 stops: the three key facts ("Now at United Airlines", the degree, SCI-2026), each a link to its section; "See my work"; "Say hello ›"; the finishes, one stop for the group (the arrow keys choose a finish, and the page re-colors); and "Pause the background motion".
3. **About**, 5 stops: footnote marks 1 and 3 in the bio (Enter jumps to the note in the footer; the note's ↩ comes back to the same mark); the Currently line's "Cartographer"; the Studying tile (Enter flips it to the days to graduation, and again back); the Local time tile (Enter switches 12- and 24-hour time and shows the overlap with your day).
4. **The highlights**, 3 stops: the card in view, its footnote mark and its +, then "Pause the highlights".
   - On a card, Left and Right move between cards and Home and End go to the first and last; the + of the new card takes the focus.
   - The + opens the card's sheet, a dialog named for the card; Escape closes it, and focus returns to the +.
   - Pause stops the films and the advance; it's a toggle, "Play the highlights" once paused. (With reduced motion there's no pause: nothing plays.)
5. **Experience**. On a screen at least 1069 × 760 with motion, the timeline (the "edit", §7.4); otherwise the stack, where the clips aren't stops and the cards read in order.
   1. The clips, in time order: WalkingTree, Truechip, EY, United Airlines, SCI-2026, Manipal University Jaipur, then one stop for the honors. Focusing a clip chooses it: the playhead springs there and the viewer shows its panel.
   2. In the honors stop, Left and Right move between the honors.
   3. While a clip has focus: Space plays and pauses (a role per 2.5 seconds), and J, K and L shuttle back, pause and forward. Any scroll you make stops playing.
   4. Then the panel on show: its footnote marks.
6. **Research**, per paper: its title (Enter opens the paper's page); Cite (Enter turns the card over, focus lands on "Cite"; Done or Escape turns it back and focus returns to Cite); Share (the share sheet, or the link copied, and the Island says so). Then its illustration:
   - **The cold chain**: the four stops, Farm to Retail. Focusing a stop opens its "Why?" panel; Escape dismisses it.
   - **The haze**: "Forecast time", a slider. Left and Right (or Up and Down) step through the forecast; Home and End go to now and to the horizon.
   - On phones, with reduced motion and without JavaScript, "Step through" steps the illustration instead of the scroll.
7. **Work**, 7 stops: the filter, one stop (the arrow keys choose All, AI, Full-stack, ML or Accessibility, and a status line says how many projects show); then each tile, with its footnote mark where it has one.
   - Enter on a tile opens its case study in the sheet; focus starts on the project's name. Escape (or the browser's Back) closes it, and focus returns to the tile.
8. **Skills**, 87 stops:
   1. "Light up the cores" (the die's ripple).
   2. The six layer labels, "AI & ML, 19 skills" to "Foundations, 11 skills". Focusing one slides its layer out and shows its list; Enter pins it, and Enter again lets it go.
   3. The core six's "used in" links (8 stops), each to the role, project or paper.
   4. The view switch, Specs | Cloud, one stop (the arrow keys switch).
   5. In Specs, every skill is a button, 67 stops (§7.7: "every skill is reachable by keyboard"). Enter chooses one: what names it lights up, the rest dims, and "Jump to …" and "Show all" follow the skill, so the next Tab reaches them. Enter again, "Show all" or Escape ends it.
   6. In Cloud, one stop: the arrow keys move between neighbors, and the skill in focus is named beneath.
   7. "See full tech specs ›" to /specs.
   - To get past the specs quickly: Search (⌘K) and "Credentials", or Shift-Tab back to the Island.
9. **Credentials**, 6 stops: the Education pass (F turns it over; Enter brings a pass forward when there are several, and the arrow keys move between them); its ⓘ, a checkbox (Space turns it over; Escape turns it back); then each medal's "Turn over" button (Enter flips it), with the Smart India Hackathon caption's footnote mark between them.
10. **Contact**, 7 stops: the dock's Email, LinkedIn and GitHub (each shows its name while focused, and Escape hides the name); then the composer's Name, Email and Message, and Send.
    - Email: Enter copies the address, and the Island says "Email copied" with "Open mail app". (Where a browser keeps the clipboard, it says it couldn't, and offers the mail app.)
    - Send with a field left empty: the field says what's missing, and focus goes to the first one.
11. **The footer**, 24 stops: each note's ↩ links (Enter returns to the mark it came from); the site map's five links; then Settings: the theme (Light, Dark, System; one stop, arrows choose), the finish (one stop, arrows choose), "Larger cursor" and "Use system cursor" (switches; Space toggles).

Then Tab wraps to the Island.

### Search and Ask

1. ⌘K (or "/", or the Island's Search) opens Search; the field has focus and the page behind is inert.
2. Type "python". ↑ and ↓ move the selection; Enter opens it; ⌘Enter opens it in a new tab; Escape closes Search and focus returns to where it was.
3. Clear the field: the Ask group suggests four questions. ↓ to "What does Akshat do at United Airlines?" and Enter: the answer streams in place, then a status reads it whole.
4. Tab (Option-Tab) reaches the answer's source chips; Enter on one closes Search and goes to the section, which lights up for a moment.
5. Edit the question: the answer goes away and the results come back.
6. Type "hello": the Top hit is the secret command. Each secret only shows when its whole phrase is typed.

### Single-key shortcuts

With focus on the page (not in a field): G lays the grid over the page and G takes it away; F turns focus mode on, and F or Escape turns it off; "/" opens Search. None fire while typing or behind a dialog, and Search's "Single-key shortcuts" action turns them all off.

### The other pages

Each starts with the same 11 Island stops, then:

- **A case study** (`/work/cognivault-ai`, or any): "‹ Work"; the stack's chips, each to its skill; "Next project".
- **A paper** (`/research/food-waste-cold-chain`, `/research/pm25-forecasting`): "‹ Research"; Share; the illustration's stops (or its slider), then "Step through"; the citation style (one stop, arrows choose APA, IEEE or BibTeX); Copy; the related projects; footnote marks and their ↩.
- **/specs**: "‹ Skills". The rest is text: read it with VoiceOver.
- **/compare**: "‹ Overview"; one picker per year (four from 735px up, two on phones).
- **/colophon**: "‹ Overview"; "Show the things to find", a disclosure (Space opens and closes it).
- **A missing page** (`/nowhere`): "Bring it into focus", home.

## Part B: VoiceOver, in Safari on macOS

1. **Landmarks.** VO-U, then Left or Right to Landmarks. The list reads: the Primary navigation, the main content, a region for each section (named by its heading: "Akshat Sharma", "Hi, I'm Akshat.", "The highlights.", "Experience.", "Research.", "Work.", "The stack.", "Education.", "Let's build something clear."), "Ways to reach me" (the dock), "Write to me", and the footer's "Notes and credits" with Notes, Site map and Settings.
2. **Headings.** VO-U, Headings. One h1, "Akshat Sharma", then an h2 for each section, each card's or role's name as an h3, and the core six as h4s. VO-Command-H moves from heading to heading in that order.
3. **Reading.** From the top, VO-A reads the page in order. Check, on the way:
   - The Island's toggle: "Overview, sections, collapsed, button". As the section changes, the toggle's name follows; it never announces the scroll progress.
   - The hero's key facts are a list, "Key facts".
   - The statement reads once, as a paragraph, not word by word.
   - At a glance is a list of six tiles; Studying and Local time are buttons, each with its whole tile as its name.
   - The highlights: "Highlights, carousel", each card "1 of 7, slide", then its words. The films are hidden from VoiceOver: each card's words carry its fact.
   - Experience, pinned: "Timeline, group", the clips as buttons with their dates; only the panel on show is in the reading order. The stack: the cards in order, the strip skipped.
   - Every count reads its final figure once ("6", not each number on the way), and every footnote mark reads "Footnote 1".
   - The Cite side of a paper isn't read until it's turned; then it's a region, "Cite".
   - Work's tiles: each a link named for its project, then its category and tagline.
   - The wallet: "Manipal University Jaipur, Education" and its fields; each medal's button names the medal.
   - The composer: "Name, edit text", "Email, edit text", "Message, edit text". A field left wrong reads "invalid data" and what's wrong when you come back to it; Send moves to the first one.
4. **Activities.** Copy the email from the dock: VoiceOver says "Email copied" without moving focus. Choose a skill in Specs: it says what it found, and the jump.
5. **Search.** ⌘K: "Search, combobox". ↓ reads each result as you move; the count is announced as you type. Ask: "Answering", then the whole answer once it's done.
6. **Dialogs.** A case study, a highlight's sheet and Search each say they're a dialog with a name, keep VoiceOver inside, and give focus back when they close.

## Part C: VoiceOver, in Safari on iOS

At 390 × 844 (an iPhone 15) and 360 × 740 if you can.

1. **Swipe through the page.** Swipe right to move, left to go back; double-tap activates. The order is the order of Part A, without the timeline's stops (phones get the stack).
2. **The Island.** Double-tap the toggle: the sheet opens over a dimmed page, the toggle reads "expanded". Swipe right: Search, the theme, "Say hello", then the seven sections. (They're read in that order, the order of the page; on screen the actions sit along the sheet's foot, nearest the thumb.) Double-tap a section: the sheet closes and VoiceOver moves to its heading. Double-tap the toggle again to close without going anywhere. (Without VoiceOver: tap the bar again, or the dimmed page.)
3. **The rotor.** Set it to Headings and swipe down: the same h1, h2s and h3s as Part B. Set it to Landmarks: the same regions.
4. **The highlights.** Swipe to a card: "1 of 7"; swiping on past its + reaches the next card, and the reel scrolls to follow. Double-tap the + to open the sheet; a two-finger scrub (Z) closes it.
5. **Research.** "Step through" steps the illustration; each stop's "Why?" is a button.
6. **Work.** Double-tap a tile: the case study opens as a sheet; the two-finger scrub, or "‹ Work", closes it, and VoiceOver returns to the tile.
7. **Contact.** The dock's tiles read their names (and show them under each tile). The composer's fields bring up the keyboard with the right type (an email keyboard for Email).
8. **Settings.** The theme and the finish are radio groups (double-tap one to choose, and it reads "selected"); the switches read "on" or "off".

## Part D: the same walk, in each edition

Repeat Part A (and spot-check B) with:

- **Reduced motion** (System Settings → Accessibility → Display → Reduce motion): no pins; Experience is the stack and Research a column; every reveal is a fade.
- **Increase contrast** and **Reduce transparency** (the same pane): every material is solid, the hairlines stronger, and the focus ring unchanged.
- **No JavaScript** (Safari → Develop → Disable JavaScript): the Island is open at the top and scrolls away (on a phone, above the hero rather than over it); every link and footnote mark works; Cite goes to the paper's page; the contact form gives way to the address.
- **Forced colors** (Windows only: Contrast themes in Edge): the system's cursor, outlined materials, and every choice (the filter, the current section, the selected result, the timeline's clip, the switches) in the system's highlight.

## Results

| Date | Where | Who | A | B | C | D | Notes |
|---|---|---|---|---|---|---|---|
| 2026-11-19 | WebKit and Chromium (Playwright), the production build | Automated, `walkthrough.spec.ts` | Pass | | | Pass (A only) | Focus ring, order and the Island checked on every stop. VoiceOver can't be driven here. |
| | Safari on macOS, VoiceOver | | | | | | |
| | Safari on iOS, VoiceOver | | | | | | |
