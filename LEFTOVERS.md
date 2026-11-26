# Leftovers

What's still open after Part 20 (26 November 2026). Everything below is on `main` at https://github.com/akshatsharma-x/record.

## Done in Part 20

- **Experience:** Merck Group, Associate Analyst Intern (Clinical and Digital Innovation and Applications), from December 2026, is the current role. United Airlines ends in November 2026.
- **Projects:** eleven projects, from the GitHub repositories, with screenshots and live links. The six new ones are NEXUS, ResearchX, BBC News Retrieval, Vistara, CabinMUJ and MyHUB. Automated Resume Screening is now CV-Scan, and QuizMUJ's stack is corrected (there's no Tailwind in it).
- **Certificates:** fifteen, from LinkedIn, so the section's heading reads "Credentials."
- **Photo:** the hero is the portrait edition, made from `me.jpeg`. You're cut out and your name sits behind your head. `me.jpeg` itself is never committed, because its metadata could say where it was taken.
- **Fixes:**
  - The credentials wallet no longer shrinks the page as it loads.
  - The timeline now reaches a role that hasn't begun yet.
  - The printed résumé fits one page.
  - The case-study sheet keeps the page still when it opens.
  - On phones, the portrait's name sits above the head.

## Before deploying on Vercel

1. Import the repository at vercel.com/new. Vercel detects Next.js; CI runs on Node 22.
2. Add environment variables only for the features you want (see `.env.example`):
   - **Contact form:** `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`. Without them the form answers 503 and offers the visitor's mail app instead.
   - **Rate limits:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
   - **Ask:** `ASK_ENABLED=true` and `ANTHROPIC_API_KEY`. Without them Ask is off.
   - **Never set `CONTACT_TRANSPORT`** in a real deployment; it's for tests.
3. Once the site has its domain, set `profile.links.site` in `content/data.ts`. Until then the site uses Vercel's production address, and the résumé has no QR code.

## Decisions waiting for you

1. **The hero.** With your photo in content, the portrait edition ships. The dot-field hero from Parts 18–19 shows only without a photo. Keep the portrait, or go back to the dot-field hero and use the photo somewhere else?
2. **A better portrait.** The portrait edition is designed for head and shoulders against a plain background, with the top of the head 15–20% down. `me.jpeg` is full-length against bookshelves, so you stand small in the frame.
3. **Your location elsewhere.** The first screen says nothing about where you are, but these still do:
   - At a glance's "Local time · IST" tile;
   - the Contact clock ("It's … IST") and its working-hours overlap;
   - the footer's "Designed and built by Akshat Sharma in India.";
   - the printed résumé;
   - Ask's answers ("Based in India").

   Remove them too?
4. **GitHub CI's Lighthouse step.** It fails because GitHub's macOS runners are slower than your Mac: there the home page scored 0.85 with LCP 2.3 s, against 0.98 and 1.7 s locally. Choose one:
   - calibrate CI's simulated CPU slowdown to the runner;
   - relax CI's thresholds;
   - keep Lighthouse on CI as information only, without failing the build.
5. **ResearchX and Cognivault AI.** Are they the same project or two? And what should ResearchX's role line say? It's a fork of Adyashas/ResearchX, and your commits wire up the full pipeline and make it deployable.

## Content gaps

These are marked `TODO(akshat)` in `content/data.ts`. All of them are listed at `/dev/content` when running `npm run dev`.

- **Merck:** what the work is, its stack and its location.
- **Projects:**
  - **Years:** MyHUB, BBC News Retrieval and Vistara need their real years, since their first commits may only be upload dates. Vistara also needs the TVS Credit hackathon's year.
  - **Roles:** solo or team, for every project.
  - **Live links:** QuizMUJ (Render) and CV-Scan (Streamlit), if those apps are up.
  - **Case studies:** each one's first chapter, the problem it solves, in a sentence or two.
  - **Repositories:** Cognivault AI has none on GitHub, and Web Accessibility Analyzer's is private.
- **Certificates:**
  - **Verify links:** each issuer's own credential page. LinkedIn's page needs a sign-in, so no pass shows a QR code or a Verify link yet.
  - **Dates:** Cisco Network Fundamentals, Coding Ninjas Data Analytics Workshop, and GeeksforGeeks Object Oriented Programming Using Java.
  - **Credential IDs:** as printed, for the nine that LinkedIn shows none for.
  - **What it proves:** a line for each pass's back.
  - **Skills:** for Claude Code in Action and AWS Cloud Practitioner Essentials, none matched the skills list.
- **Older gaps:** the city (only "India" or "IST" shows until it's confirmed), the papers' DOIs, footnote sources, and the rest listed at `/dev/content`.

## Left out on purpose

- **CabinMUJ screenshots:** the search, directory and profile screens show real faculty names and photos, and one shows an email address and a phone number.
- **QuizMUJ screenshots:** the live monitor and leaderboard show students' names.
- **Smart India Hackathon (internal round):** it isn't a certificate pass, because it's already on the site as an honour.

## Worth knowing

- **Ports:** on this Mac, ports 3000, 3100 (CabinMUJ) and 3210 (vistara) belong to other apps. Run the end-to-end tests as `E2E_PORT=3291 npm run test:e2e`.
- **Flaky tests:** a few timing-sensitive tests can fail while the machine is busy, for example the dock's magnify and the console greeting. They pass when run alone, and CI retries twice.
- **Shell setting:** your shell sets `NODE_TLS_REJECT_UNAUTHORIZED=0`, which turns off TLS certificate checks for Node. It's outside this project, but worth removing if you don't need it.
