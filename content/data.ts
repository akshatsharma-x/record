/**
 * Everything the site knows about Akshat, from Akshat's three résumé versions and the
 * decisions Akshat has made. Use it verbatim; never embellish (DESIGN.md §2 rule 1).
 *
 * - A gap is null with a TODO(akshat) comment. Nothing renders it in production.
 * - The phone number is never written here or anywhere else (DESIGN.md §2 rule 2).
 * - Copy listed under `drafts` stays a draft until Akshat approves it (DESIGN.md §9).
 * - Proofread all of it at /dev/content (npm run dev).
 */
import type { ContentInput } from "./schema.ts";

export const data = {
  profile: {
    name: "Akshat Sharma",
    initials: "AS",
    role: "AI & ML Engineer",
    headline: "I build intelligent systems — and make them clear.",
    // AI & ML Intern (Generative AI) at United Airlines, since 2026-06.
    now: "merck",
    location: {
      city: "Jaipur",
      // TODO(akshat): inferred from the university. Until it's confirmed, show only "India" or "IST".
      cityConfirmed: null,
      country: "India",
      timeZone: "Asia/Kolkata",
    },
    // Confirmed.
    workingHours: { start: "10:00", end: "18:00" },
    availability: null, // TODO(akshat): graduation is 2027-07.
    email: "akshatsharma.data@gmail.com",
    links: {
      linkedin: "https://www.linkedin.com/in/akshatsharma-in",
      github: "https://github.com/akshatsharma-x",
      scholar: null, // TODO(akshat)
      orcid: null, // TODO(akshat)
      site: null, // TODO(akshat): the site's address once it's live, for the printed résumé's QR code.
      retrograde: null, // TODO(akshat): the RETROGRADE edition's address, for Search's "retro".
    },
    resumePdf: null, // TODO(akshat): a résumé PDF without the phone number. Until then, no download.
    // The portrait (DESIGN.md §7, Part 5), from Akshat's photo (Part 20): a 3:4 crop with
    // the top of the head a quarter of the way down, the highest a frame 3000px tall
    // allows. The subject is cut out with macOS Vision's subject mask; the plate fills
    // where Akshat stood from its surroundings, and is only ever shown blurred. Neither
    // file carries the photo's metadata.
    photo: {
      alt: "Akshat standing in a red, book-lined alcove, in a dark jacket over a red T-shirt, one arm resting on a shelf, smiling.",
      subject: { src: "/portrait/subject.png", width: 2268, height: 3024 },
      plate: { src: "/portrait/plate.jpg", width: 2268, height: 3024 },
      headTop: 0.25,
    },
    // Résumé facts only.
    bio: [
      {
        text: "I'm a computer science undergraduate at Manipal University Jaipur, graduating in 2027, and I work where large language models meet production software. At United Airlines I build Cartographer, a LangGraph system that writes six documentation artifacts in two LLM calls on top of a code knowledge graph.",
        footnotes: [1],
      },
      {
        text: "Before that I built full-stack features with Next.js and Django REST Framework for a TRAI engagement at EY, a Core Java backend at Truechip, and parts of Engazewell — an employee-management system with 2,500+ daily users — at WalkingTree. My research applies interpretable machine learning to sustainability; I presented it at SCI-2026 (Springer LNNS).",
        footnotes: [3],
      },
    ],
  },

  currentFocus: {
    building: {
      name: "Cartographer",
      detail: "LLM documentation tooling at United Airlines",
      experience: "united-airlines",
    },
    researching: "Interpretable ML for sustainability", // TODO(akshat): confirm
    reading: null, // TODO(akshat)
  },

  // Newest first.
  experience: [
    {
      id: "merck",
      org: "Merck Group",
      short: "Merck",
      role: "Associate Analyst Intern (Clinical and Digital Innovation and Applications)",
      kind: "internship",
      start: "2026-12",
      end: "present",
      location: null, // TODO(akshat)
      summary: { text: "Associate Analyst intern in Merck Group's Clinical and Digital Innovation and Applications team, from December 2026." },
      // TODO(akshat): what the work is, once it has begun, with its stack.
      bullets: [{ text: "Joins the Clinical and Digital Innovation and Applications team in December 2026." }],
      stack: ["Clinical and digital innovation"],
    },
    {
      id: "united-airlines",
      org: "United Airlines",
      role: "AI & ML Intern (Generative AI)",
      kind: "internship",
      start: "2026-06",
      end: "2026-11",
      location: null, // TODO(akshat)
      summary: { text: "LLM model monitoring and automation for Fortune 500 enterprise-level ML models." },
      bullets: [
        {
          text: "Built Cartographer with LangGraph, GPT-4.1 and Claude Sonnet 4.5: it generates 6 documentation artifacts in 2 LLM calls.",
          footnotes: [1],
        },
        {
          text: "Developed a code knowledge graph of dependencies, API surfaces and architectural relationships across large codebases.",
        },
        {
          text: "Cut inference cost to $0.08–0.11 per run with 22–25% token compression and SHA-256 caching, across 35 eval scenarios.",
          footnotes: [2],
        },
      ],
      metrics: [
        { value: 6, label: "documentation artifacts", footnotes: [1] },
        { value: 2, label: "LLM calls", footnotes: [1] },
        { value: [0.08, 0.11], label: "per run", footnotes: [2] },
        { value: [22, 25], label: "token compression", footnotes: [2] },
        { value: 35, label: "eval scenarios", footnotes: [2] },
      ],
      visual: { kind: "tangle-to-map", calls: 2, documents: 6, cost: [0.08, 0.11] },
      stack: ["LangGraph", "GPT-4.1", "Claude Sonnet 4.5", "knowledge graphs"],
      confidential: {
        note: "Internal work. Keep the visuals abstract and show nothing beyond the résumé.",
        shareable: null, // TODO(akshat): confirm what's shareable.
      },
    },
    {
      id: "ey",
      org: "Ernst & Young (EY)",
      short: "EY",
      role: "Software Development Intern",
      kind: "internship",
      start: "2026-06",
      end: "2026-07",
      location: "Hybrid",
      summary: {
        text: "Full-stack features for a TRAI India engagement under IT Transformation in Government & Public Sector, a regulated environment.",
      },
      bullets: [
        { text: "Built full-stack features with Next.js 16 (App Router), TypeScript, React and Tailwind CSS." },
        {
          text: "Built a Django REST Framework backend with JWT auth, RESTful APIs and PostgreSQL, tested end to end in Postman.",
        },
        { text: "Worked in an Agile team on Git/GitHub: code reviews and SDLC-driven iterative delivery." },
      ],
      visual: { kind: "route-segments" },
      stack: [
        "Next.js",
        "TypeScript",
        "React",
        "Tailwind CSS",
        "Django REST Framework",
        "PostgreSQL",
        "JWT",
        "Postman",
      ],
    },
    {
      id: "truechip",
      org: "Truechip Solutions Pvt. Ltd.",
      short: "Truechip",
      role: "Java Intern",
      kind: "internship",
      start: "2025-12",
      end: "2026-01",
      location: null, // TODO(akshat)
      summary: { text: "Core Java backend work across 10+ modules, with unit testing and code review in an enterprise SDLC." },
      bullets: [
        { text: "Contributed to a Core Java backend across 10+ modules using OOP and modular design." },
        {
          text: "Reached 90%+ test coverage through unit testing and debugging, cutting post-integration defects by ~30%.",
          footnotes: [4],
        },
        {
          text: "Took part in code reviews with Git and enterprise coding standards, cutting review turnaround by ~25%.",
          footnotes: [4],
        },
      ],
      // TODO(akshat): "10+ modules" has no source to footnote.
      metrics: [
        { value: 10, label: "modules" },
        { value: 90, label: "test coverage", footnotes: [4] },
        { value: 30, label: "fewer post-integration defects", footnotes: [4] },
        { value: 25, label: "faster review turnaround", footnotes: [4] },
      ],
      visual: { kind: "module-blocks", modules: 10, coverage: 90, defects: 30 },
      stack: ["Java", "OOP", "unit testing", "Git"],
    },
    {
      id: "walkingtree",
      org: "WalkingTree Technologies",
      short: "WalkingTree",
      role: "Technical Intern",
      kind: "internship",
      start: "2025-07",
      end: "2025-08",
      location: null, // TODO(akshat)
      summary: {
        text: "Backend and UI work on Engazewell, an enterprise employee-management system with 10,000+ records and 2,500+ daily active users.",
        footnotes: [3],
      },
      bullets: [
        { text: "Worked on the Java and MongoDB backend, optimizing data-aggregation pipelines for fast retrieval." },
        { text: "Worked with cloud-integrated systems and scalable backend architecture for enterprise applications." },
        {
          // TODO(akshat): one résumé says A/B testing; which is right?
          text: "Built responsive React UI and Power BI dashboards for workforce analytics, validated through manual testing.",
        },
      ],
      metrics: [
        { value: 10000, label: "records", footnotes: [3] },
        { value: 2500, label: "daily active users", footnotes: [3] },
      ],
      visual: { kind: "dashboard", users: 2500 },
      stack: ["Java", "MongoDB", "React", "Power BI"],
    },
  ],

  education: [
    {
      kind: "degree",
      id: "manipal-university-jaipur",
      institution: "Manipal University Jaipur",
      degree: "B.Tech",
      field: "Computer Science and Engineering",
      start: "2023-07",
      end: "2027-07",
      grade: { text: "CGPA 8.79/10" },
      coursework: [
        "Design & Analysis of Algorithms",
        "NLP",
        "Computer Vision",
        "Cryptography",
        "Digital Image Processing",
      ],
    },
    { kind: "school", id: "class-xii", level: "Class XII", board: "CBSE", grade: { text: "95.4%" }, year: 2022 },
    { kind: "school", id: "class-x", level: "Class X", board: "CBSE", grade: { text: "93.8%" }, year: 2020 },
  ],

  conferences: [
    {
      id: "sci-2026",
      name: "SCI-2026",
      kind: "International conference",
      host: "Swinburne Vietnam",
      city: "Hanoi",
      country: "Vietnam",
      start: "2026-04-28",
      end: "2026-04-29",
      proceedings: "Springer LNNS",
    },
  ],

  // Both accepted and presented at SCI-2026. Each becomes "published" once it has a DOI.
  publications: [
    {
      slug: "food-waste-cold-chain",
      title:
        "An Interpretable Artificial Intelligence Framework for Food Waste Prediction and Prevention in Cold-Chain Logistics",
      short: "Food waste in cold chains",
      tldr: "An AI framework that predicts food waste in cold-chain logistics, and explains each prediction so the waste can be prevented.",
      keywords: ["interpretable AI", "explainable ML", "food waste", "cold-chain logistics", "sustainability"],
      presentedAt: "sci-2026",
      // Until these are in, the paper says who presented it and offers no citation.
      coAuthors: null, // TODO(akshat)
      abstract: null, // TODO(akshat)
      doi: null, // TODO(akshat)
      pdf: null, // TODO(akshat): PDF rights
      // The idea drawn, not the paper's results: the stops and factors are illustrative.
      illustration: {
        kind: "cold-chain",
        hint: "Choose a stop to see why.",
        stops: ["Farm", "Storage", "Transport", "Retail"],
        factors: ["Temperature excursions", "Dwell time", "Distance"],
      },
    },
    {
      slug: "pm25-forecasting",
      title: "Short-Term PM2.5 Forecasting Using ML for Sustainable Urban Air Quality",
      short: "PM2.5 forecasting",
      tldr: "Machine-learning models that forecast fine-particle air pollution a short time ahead, so cities can act on air quality sooner.",
      keywords: ["PM2.5", "air quality", "time-series forecasting", "machine learning", "sustainability"],
      presentedAt: "sci-2026",
      // Until these are in, the paper says who presented it and offers no citation.
      coAuthors: null, // TODO(akshat)
      abstract: null, // TODO(akshat)
      doi: null, // TODO(akshat)
      pdf: null, // TODO(akshat): PDF rights
      illustration: { kind: "haze", hint: "Drag the handle to look ahead." },
    },
  ],

  projects: [
    {
      slug: "nexus",
      name: "NEXUS",
      tagline: { text: "A personalized learning platform for career transitions" },
      category: "AI system",
      summary: {
        text: "Conversational onboarding draws out the target role, timeline, experience and skills, and shows the learner's profile as it's built; an adaptive learning path of skills, resources, projects and assessments unlocks each step as its prerequisites complete, and writes assessment results back into per-skill mastery; the Skill Universe draws every skill as a knowledge map in three dimensions, coloured by mastery; and a tutor answers from the learner's own progress, offline by default, with Claude optional. No accounts: all data stays in the browser.",
      },
      stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion", "Three.js", "React Three Fiber", "Anthropic SDK"],
      year: 2026,
      role: null, // TODO(akshat): solo or team.
      links: { repo: "https://github.com/akshatsharma-x/nexus", live: "https://nexus-opal-phi-60.vercel.app" },
      screenshots: [
        { src: "/work/nexus/01-home-dark.png", alt: "The NEXUS dashboard: the goal ML Engineer, journey progress, level, XP, streak and the next step" },
        { src: "/work/nexus/02-onboarding.png", alt: "Conversational onboarding: the learner states a goal and a profile panel fills in goal, starting point and skills" },
        { src: "/work/nexus/03-journey.png", alt: "A journey step opened as a sheet: a video lesson with its skills, why it's in the path and what it teaches" },
        { src: "/work/nexus/04-skills.png", alt: "The Skill Universe: a 3D knowledge map of skills coloured by mastery, with one skill's details beside it" },
        { src: "/work/nexus/05-assessment.png", alt: "A Python foundations assessment: a multiple-choice question, question 1 of 5" },
        { src: "/work/nexus/06-tutor.png", alt: "The tutor answering how far the learner is from being job-ready, from their own progress, offline" },
      ],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "A staged journey whose steps unlock as prerequisites complete, and a tutor that runs fully offline, with no accounts." },
      architecture: {
        nodes: [
          { id: "onboarding", label: "Conversational onboarding" },
          { id: "path", label: "Adaptive learning path" },
          { id: "assessments", label: "Assessments" },
          { id: "mastery", label: "Per-skill mastery" },
          { id: "universe", label: "Skill Universe", detail: "knowledge map" },
          { id: "tutor", label: "Tutor", detail: "offline by default" },
          { id: "browser", label: "In the browser", from: "all data stays in the browser" },
        ],
        edges: [
          ["onboarding", "path"],
          ["path", "assessments"],
          ["assessments", "mastery"],
          ["mastery", "universe"],
          ["mastery", "tutor"],
          ["tutor", "browser", "dashed"],
        ],
      },
    },
    {
      slug: "researchx",
      name: "ResearchX",
      tagline: { text: "An autonomous multi-agent research platform" },
      category: "AI system",
      summary: {
        text: "A LangGraph pipeline of 17 agents plans the research, searches the web, academic sources and news in parallel, fact-checks claims against the evidence, hunts for counter-evidence, and writes a report in which every citation points to a real, numbered source. A replanner and a critic send weak drafts back within a budget, and the graph's state is checkpointed to PostgreSQL after every step, so a job resumes where its worker stopped.",
        footnotes: [7],
      },
      stack: ["LangGraph", "LangChain", "Gemini", "Tavily", "FastAPI", "Celery", "Redis", "PostgreSQL", "Next.js", "React", "Tailwind CSS"],
      year: 2026,
      // TODO(akshat): the role line. A fork of Adyashas/ResearchX: Akshat's commits wire up the full research pipeline and make it deployable. And is it Cognivault AI?
      role: null,
      links: { repo: "https://github.com/akshatsharma-x/ResearchX" },
      screenshots: [
        { src: "/work/researchx/01-hero.png", alt: "The ResearchX landing page: from question to verified report, with agents that plan, search, verify and synthesize" },
        { src: "/work/researchx/02-pipeline-running.png", alt: "The agent pipeline as a grid of 17 stages, from the query analyzer to the critic, with the claim verifier running" },
        { src: "/work/researchx/03-agent-trace.png", alt: "An agent execution trace: the query analyzer, planner and academic, web and news agents, each completed" },
      ],
      metrics: [{ value: 17, label: "agents", footnotes: [7] }],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "Grounded citations: the reference list comes from the source data, not the model, so a citation can only point to a source that exists." },
      architecture: {
        nodes: [
          { id: "plan", label: "Planner", from: "plans the research" },
          { id: "web", label: "Web", from: "searches the web" },
          { id: "academic", label: "Academic sources" },
          { id: "news", label: "News" },
          { id: "check", label: "Fact-check", from: "fact-checks claims against the evidence" },
          { id: "counter", label: "Counter-evidence" },
          { id: "report", label: "Report", detail: "numbered sources", from: "writes a report" },
          { id: "state", label: "Checkpoints", detail: "PostgreSQL", from: "checkpointed to PostgreSQL" },
        ],
        edges: [
          ["plan", "web"],
          ["plan", "academic"],
          ["plan", "news"],
          ["web", "check"],
          ["academic", "check"],
          ["news", "check"],
          ["check", "counter"],
          ["counter", "report"],
          ["report", "state", "dashed"],
        ],
      },
    },
    {
      slug: "resume-screening",
      name: "CV-Scan",
      tagline: { text: "Explainable AI resume screening" },
      category: "NLP",
      summary: {
        text: "Ranks resumes against a job description with a hybrid TF-IDF + Sentence-BERT score (Python, Streamlit, Transformers), shows which skills drive each score next to the job's requirements found and missing, and benchmarks each candidate against 2,361 historical resumes; batch screening of PDF, DOCX and TXT resumes into a ranked leaderboard with CSV export; a PCA semantic map, and a calibrated SVM that predicts each resume's domain out of 24.",
        footnotes: [8],
      },
      stack: ["Python", "Streamlit", "Transformers", "Sentence-BERT", "TF-IDF", "LinearSVC", "PCA", "NLTK", "Plotly"],
      year: 2026,
      role: null, // TODO(akshat)
      links: { repo: "https://github.com/akshatsharma-x/cv-scan" }, // TODO(akshat): the Streamlit app's link, if it's up.
      screenshots: [
        { src: "/work/resume-screening/01-home.png", alt: "The CV-Scan home: screen resumes with intelligent precision, with the resumes indexed, the categories and the ROC-AUC" },
        { src: "/work/resume-screening/02-results.png", alt: "The results leaderboard: candidates ranked by hybrid, keyword and semantic scores, with pool rank and domain" },
        { src: "/work/resume-screening/03-deep-dive.png", alt: "One resume's deep dive: its scores, the terms driving them, and the job's requirements missing" },
        { src: "/work/resume-screening/04-benchmark.png", alt: "The pool benchmark: a candidate's scores against the historical pool's median and top tenth" },
        { src: "/work/resume-screening/05-semantic-map.png", alt: "The semantic map: a PCA projection of Sentence-BERT vectors, historical resumes coloured by match" },
        { src: "/work/resume-screening/06-evaluation.png", alt: "Model evaluation: TF-IDF, BERT and the hybrid compared on accuracy, F1, MCC and ranking" },
      ],
      metrics: [
        { value: 0.786, label: "category accuracy", footnotes: [8] },
        { value: 2361, label: "historical resumes", footnotes: [8] },
        { value: 24, label: "domains", footnotes: [8] },
        { value: 0.704, label: "TF-IDF alone", footnotes: [8] },
        { value: 0.892, label: "ranking ROC-AUC", footnotes: [8] },
      ],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: {
        text: "On a held-out evaluation, the hybrid's category accuracy is 0.786, against 0.704 for TF-IDF alone, and job-to-resume ranking reaches a ROC-AUC of 0.892.",
        footnotes: [8],
      },
      preview: { kind: "lanes", labels: { left: "TF-IDF", right: "Sentence-BERT", ranked: "Ranked leaderboard", scatter: "PCA" } },
      architecture: {
        nodes: [
          { id: "resumes", label: "Resumes", detail: "PDF, DOCX, TXT" },
          { id: "tfidf", label: "TF-IDF" },
          { id: "sbert", label: "Sentence-BERT" },
          { id: "hybrid", label: "Hybrid score" },
          { id: "leaderboard", label: "Ranked leaderboard" },
          { id: "benchmark", label: "Benchmark", detail: "historical resumes" },
          { id: "svm", label: "Calibrated SVM", detail: "domain" },
          { id: "map", label: "PCA semantic map" },
        ],
        edges: [
          ["resumes", "tfidf"],
          ["resumes", "sbert"],
          ["tfidf", "hybrid"],
          ["sbert", "hybrid"],
          ["hybrid", "leaderboard"],
          ["leaderboard", "benchmark"],
          ["resumes", "svm"],
          ["sbert", "map"],
        ],
      },
    },
    {
      slug: "quizmuj",
      name: "QuizMUJ",
      tagline: { text: "A proctored quiz and assessment platform for Manipal University Jaipur" },
      category: "Full-stack",
      summary: {
        text: "Focus-mode exams with a server-controlled timer, and autosave to the server and the device, so a reload, crash or device switch resumes the attempt; proctoring that streams tab switches, leaving the window, exiting full screen, copy attempts and disconnects live to faculty, on Socket.io; a quiz builder with cohort targeting and CSV import, and per-quiz analytics down to each question's most common wrong answer. Sign-up takes only university email addresses, verified by one-time codes, and answers stay hidden until the quiz's reveal policy allows. Built with HTML, CSS, JavaScript, Node.js, Express, MongoDB and Docker.",
      },
      stack: ["HTML", "CSS", "JavaScript", "Node.js", "Express", "MongoDB", "Socket.io", "Nodemailer", "Docker"],
      year: 2026,
      role: null, // TODO(akshat)
      links: { repo: "https://github.com/akshatsharma-x/Quiz-App" }, // TODO(akshat): the live link, if the Render app is up.
      screenshots: [
        { src: "/work/quizmuj/01-student-dashboard.png", alt: "The student dashboard: XP, rank, quizzes completed and average score, open and upcoming quizzes, recent results" },
        { src: "/work/quizmuj/02-exam-focus-mode.png", alt: "An exam in focus mode: a timed multiple-choice question, a question palette and proctoring on" },
        { src: "/work/quizmuj/04-analytics.png", alt: "Student analytics: average and best score, XP and time on exams, a score trend and mastery per topic" },
        { src: "/work/quizmuj/05-quiz-builder.png", alt: "The quiz builder: cohort targeting by programme and year, a question with four options, a pre-publish checklist" },
      ],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "Real-time exams with proctoring, where a reload, crash or device switch resumes the attempt." },
      preview: { kind: "exam-room", labels: { room: "Focus-mode exams", alert: "Tab switches", proctor: "Proctoring" } },
      architecture: {
        nodes: [
          { id: "exam", label: "Focus-mode exams", detail: "server-controlled timer" },
          { id: "autosave", label: "Autosave", detail: "server and device", from: "autosave to the server and the device" },
          { id: "proctor", label: "Proctoring", detail: "Socket.io" },
          { id: "faculty", label: "Faculty", from: "live to faculty" },
          { id: "builder", label: "Quiz builder", detail: "CSV import" },
          { id: "analytics", label: "Analytics", from: "per-quiz analytics" },
          { id: "api", label: "Express", detail: "MongoDB" },
        ],
        edges: [
          ["exam", "autosave"],
          ["exam", "proctor"],
          ["proctor", "faculty"],
          ["builder", "api"],
          ["autosave", "api"],
          ["api", "analytics"],
        ],
      },
    },
    {
      slug: "bbc-news-retrieval",
      name: "BBC News Retrieval",
      tagline: { text: "Lexical, semantic and hybrid search over the BBC News archive" },
      category: "NLP",
      summary: {
        text: "Four rankers over one inverted index: TF-IDF, BM25, a Sentence Transformer, and a hybrid that fuses BM25 and the Sentence Transformer by Reciprocal Rank Fusion; a TREC-style test collection built from scratch, with 25 topics and 957 graded relevance judgments; and a live app that runs entirely in the browser, the engine ported to JavaScript and the encoder an ONNX model through transformers.js. An Information Retrieval course project.",
        footnotes: [9],
      },
      stack: ["Python", "Sentence Transformers", "BM25", "TF-IDF", "NLTK", "Streamlit", "Altair", "transformers.js", "ONNX"],
      year: null, // TODO(akshat): first committed on 2026-11-25, which may be when it was uploaded.
      role: null, // TODO(akshat)
      links: { repo: "https://github.com/akshatsharma-x/BBC-News-Retrieval", live: "https://akshatsharma-x.github.io/BBC-News-Retrieval/app/" },
      screenshots: [
        { src: "/work/bbc-news-retrieval/02-ui-compare.png", alt: "Comparing models: one query's top five from TF-IDF, BM25, the Sentence Transformer and the hybrid, side by side" },
        { src: "/work/bbc-news-retrieval/01-ui-search.png", alt: "Search over the BBC News archive, ranked by the hybrid, with the matched terms highlighted" },
        { src: "/work/bbc-news-retrieval/03-ui-benchmark.png", alt: "The benchmark: MAP, nDCG, recall and MRR per model, with precision–recall curves and a results table" },
        { src: "/work/bbc-news-retrieval/04-ui-explorer.png", alt: "The topic explorer: a test topic's live metrics per model, and the hybrid's top ten with relevance judgments" },
      ],
      metrics: [
        { value: 0.811, label: "hybrid MAP", footnotes: [9] },
        { value: 25, label: "topics", footnotes: [9] },
        { value: 957, label: "relevance judgments", footnotes: [9] },
        { value: 0.812, label: "hybrid MRR", footnotes: [9] },
        { value: 2066, label: "known-item queries", footnotes: [9] },
      ],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: {
        text: "A hybrid MAP of 0.811 on the 25 topics, and on 2,066 known-item queries a hybrid MRR of 0.812, ahead of every other model.",
        footnotes: [9],
      },
      preview: { kind: "lanes", labels: { left: "BM25", right: "Sentence Transformer", ranked: "Reciprocal Rank Fusion", scatter: "Test collection" } },
      architecture: {
        nodes: [
          { id: "index", label: "Inverted index" },
          { id: "tfidf", label: "TF-IDF" },
          { id: "bm25", label: "BM25" },
          { id: "encoder", label: "Sentence Transformer" },
          { id: "fusion", label: "Reciprocal Rank Fusion", detail: "hybrid" },
          { id: "collection", label: "Test collection", detail: "relevance judgments", from: "TREC-style test collection" },
          { id: "browser", label: "Browser app", detail: "ONNX", from: "runs entirely in the browser" },
        ],
        edges: [
          ["index", "tfidf"],
          ["index", "bm25"],
          ["index", "encoder"],
          ["bm25", "fusion"],
          ["encoder", "fusion"],
          ["collection", "fusion", "dashed"],
          ["fusion", "browser"],
        ],
      },
    },
    {
      slug: "vistara",
      name: "Vistara",
      tagline: { text: "Credit scoring from the rhythm of recurring life events" },
      category: "Full-stack",
      summary: {
        text: "For thin-file applicants, it reads only the timing of recurring life events (vehicle service, UPI mandates, utility bills, phone recharges, FASTag), never amounts. Each signal has an expected cadence and a weight and is scored on how steady its gaps are, and coherence across the signals carries a quarter of the score, so being evenly consistent beats excelling at one habit. The result is a 300–900 score with a tier, a loan offer, a recommended EMI date and a dated path to the next tier; thin files get a rhythm-building path instead.",
        footnotes: [10],
      },
      stack: ["Next.js", "TypeScript"],
      year: null, // TODO(akshat): the TVS Credit hackathon's year; first committed on 2026-11-25, which may be when it was uploaded.
      role: null, // TODO(akshat)
      links: { repo: "https://github.com/akshatsharma-x/Vistara", live: "https://vistara-delta-fawn.vercel.app" },
      screenshots: [
        { src: "/work/vistara/01-landing.png", alt: "The Vistara landing page: credit scoring that reads how you live" },
        { src: "/work/vistara/02-score-hero.png", alt: "A Vistara score of 708 out of 900, Near Prime, beside a bureau score of no hit for the same applicant" },
        { src: "/work/vistara/03-score-strips.png", alt: "Event strips for five rhythms over 18 months, each event on beat, off beat or missed" },
        { src: "/work/vistara/04-score-factors.png", alt: "The consistency index by domain, and the band and weight of each signal" },
        { src: "/work/vistara/05-path-to-prime.png", alt: "The path to Prime: the points to the next tier, and the gain from fixing each rhythm" },
        { src: "/work/vistara/06-method.png", alt: "The method: cross-domain coherence compared with an arithmetic mean, and the rhythms with their weights" },
      ],
      metrics: [{ value: [300, 900], label: "score range", footnotes: [10] }],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "A prototype for the TVS Credit hackathon, on synthetic data: the engine is plain TypeScript with no ML library, and seeded, so the same input always gives the same score." },
      architecture: {
        nodes: [
          { id: "events", label: "Recurring life events" },
          { id: "cadence", label: "Expected cadence", detail: "and a weight" },
          { id: "gaps", label: "Steady gaps", from: "how steady its gaps are" },
          { id: "coherence", label: "Coherence across the signals" },
          { id: "score", label: "Score", detail: "and a tier" },
          { id: "offer", label: "Loan offer" },
          { id: "path", label: "Path to the next tier", from: "dated path to the next tier" },
        ],
        edges: [
          ["events", "cadence"],
          ["cadence", "gaps"],
          ["gaps", "coherence"],
          ["coherence", "score"],
          ["score", "offer"],
          ["score", "path"],
        ],
      },
    },
    {
      slug: "cognivault-ai",
      name: "Cognivault AI",
      tagline: { text: "A multi-agent research assistant" },
      category: "AI system",
      summary: {
        text: "Multi-agent RAG with A2A communication (FastAPI, LangChain, Gemini 1.5) for automated summarization; FAISS + HyDE retrieval; a custom orchestrator routes automatable sub-tasks by intent; Gemini Vision extracts structured data from PDFs; FastAPI, PostgreSQL, Next.js, Docker; evaluated with Ragas.",
      },
      stack: [
        "RAG",
        "A2A",
        "FastAPI",
        "LangChain",
        "Gemini 1.5",
        "FAISS",
        "HyDE",
        "Gemini Vision",
        "PostgreSQL",
        "Next.js",
        "Docker",
        "Ragas",
      ],
      year: null, // TODO(akshat)
      role: null, // TODO(akshat)
      links: null, // TODO(akshat): repo and live links
      screenshots: null, // TODO(akshat)
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "Automated summarization, evaluated with Ragas." },
      preview: { kind: "agents", labels: { query: "Query", agents: "A2A", hypothetical: "HyDE", neighbors: "FAISS", summary: "Summary" } },
      architecture: {
        nodes: [
          { id: "query", label: "Query" },
          { id: "orchestrator", label: "Intent orchestrator", from: "orchestrator routes automatable sub-tasks by intent" },
          { id: "agents", label: "A2A agents", from: "Multi-agent RAG with A2A communication" },
          { id: "retrieval", label: "FAISS + HyDE", detail: "retrieval" },
          { id: "vision", label: "Gemini Vision", detail: "PDF extraction", from: "Gemini Vision extracts structured data from PDFs" },
          { id: "summary", label: "Summary", from: "automated summarization" },
          { id: "ragas", label: "Ragas", detail: "evaluation", from: "evaluated with Ragas" },
        ],
        edges: [
          ["query", "orchestrator"],
          ["orchestrator", "agents"],
          ["agents", "retrieval"],
          ["retrieval", "vision"],
          ["vision", "summary"],
          ["summary", "ragas", "dashed"],
        ],
      },
    },
    {
      slug: "churn-prediction",
      name: "Predictive Customer Churn",
      tagline: { text: "A stacking ensemble at 97% accuracy and 0.98 ROC-AUC", footnotes: [5] },
      category: "Machine learning",
      summary: {
        text: "Stacking ensemble, 97% accuracy and 0.98 ROC-AUC; SMOTE, KerasTuner, TensorFlow; feature-importance analysis of churn drivers to inform retention strategy.",
        footnotes: [5],
      },
      stack: ["SMOTE", "KerasTuner", "TensorFlow"],
      year: null, // TODO(akshat)
      role: null, // TODO(akshat)
      links: { repo: "https://github.com/akshatsharma-x/customer-churn-prediction" },
      screenshots: null, // TODO(akshat)
      metrics: [
        { value: 97, label: "accuracy", footnotes: [5] },
        { value: 0.98, label: "ROC-AUC", footnotes: [5] },
      ],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "Feature-importance analysis of churn drivers to inform retention strategy." },
      preview: { kind: "roc", auc: 0.98, accuracy: 97 },
      architecture: {
        nodes: [
          { id: "data", label: "Data" },
          { id: "smote", label: "SMOTE" },
          { id: "learners", label: "Base learners", from: "Stacking ensemble" },
          { id: "meta", label: "Meta-learner", from: "Stacking ensemble" },
          { id: "scores", label: "97% · 0.98", detail: "accuracy · ROC-AUC", from: "97% accuracy and 0.98 ROC-AUC", footnotes: [5] },
          { id: "importance", label: "Feature importance", from: "feature-importance analysis" },
          { id: "retention", label: "Retention insights", from: "inform retention strategy" },
        ],
        edges: [
          ["data", "smote"],
          ["smote", "learners"],
          ["learners", "meta"],
          ["meta", "scores"],
          ["scores", "importance"],
          ["importance", "retention"],
        ],
      },
    },
    {
      slug: "wcag-analyzer",
      name: "Web Accessibility Analyzer",
      tagline: { text: "A WCAG 2.1 compliance tool" },
      category: "Accessibility",
      summary: {
        text: "A headless DOM crawler detects accessibility issues (alt text, ARIA, navigation and more); a rule-based analyzer scores them, suggests fixes and writes reports.",
      },
      stack: null, // TODO(akshat): its stack
      year: null, // TODO(akshat)
      role: null, // TODO(akshat)
      links: null, // TODO(akshat): repo and live links
      screenshots: null, // TODO(akshat)
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "Accessibility issues scored, with suggested fixes and a written report." },
      preview: { kind: "scan", labels: { issues: "Issues", score: "Score" } },
      architecture: {
        nodes: [
          { id: "url", label: "URL" },
          { id: "crawler", label: "Headless crawler", from: "headless DOM crawler" },
          { id: "rules", label: "WCAG 2.1 rules", from: "WCAG 2.1 compliance tool" },
          { id: "score", label: "Score and fixes", from: "scores them, suggests fixes" },
          { id: "report", label: "Report", from: "writes reports" },
        ],
        edges: [
          ["url", "crawler"],
          ["crawler", "rules"],
          ["rules", "score"],
          ["score", "report"],
        ],
      },
    },
    {
      slug: "cabinmuj",
      name: "CabinMUJ",
      tagline: { text: "Find any Manipal University Jaipur faculty member's cabin in seconds" },
      category: "Full-stack",
      summary: {
        text: "Live search that shows a faculty member's block, floor and cabin as you type; a directory filtered by department, block, floor, designation or HoD; and a campus map, block by block and floor by floor. Students report outdated locations; an admin panel tracks verification, resolves those reports, keeps a full change history with restore, and backs up all data as JSON. A Python scraper gathers the faculty.",
      },
      stack: ["Next.js", "TypeScript", "Upstash Redis", "Vercel", "Python"],
      year: 2026,
      role: null, // TODO(akshat)
      links: { repo: "https://github.com/akshatsharma-x/CabinMUJ", live: "https://cabin-muj.vercel.app" },
      // Only the screens without people's names and details.
      screenshots: [
        { src: "/work/cabinmuj/01-home.png", alt: "The CabinMUJ home: find any faculty at MUJ in seconds, with a search and an illustration of a campus building" },
        { src: "/work/cabinmuj/04-campus-map.png", alt: "The campus directory: four blocks with their faculty counts, floor by floor" },
      ],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      // Not "accurate": its seed data's cabins were assigned at random and start unverified.
      outcome: { text: "Every location carries its verification, and students' reports of outdated ones reach the admin to resolve." },
      architecture: {
        nodes: [
          { id: "scraper", label: "Python scraper" },
          { id: "redis", label: "Upstash Redis" },
          { id: "search", label: "Live search" },
          { id: "directory", label: "Directory" },
          { id: "map", label: "Campus map" },
          { id: "reports", label: "Reports", from: "Students report outdated locations" },
          { id: "admin", label: "Admin panel", detail: "change history" },
        ],
        edges: [
          ["scraper", "redis"],
          ["redis", "search"],
          ["redis", "directory"],
          ["redis", "map"],
          ["reports", "admin"],
          ["admin", "redis"],
        ],
      },
    },
    {
      slug: "myhub",
      name: "MyHUB",
      tagline: { text: "Your life, in receipts" },
      category: "Full-stack",
      summary: {
        text: "Three public datasets read as one person's decade: receipts in nine kinds, the connections between them, and a story about what they add up to. None of the rows is Akshat's, and the site says so on its sources page. Searchable receipts, threads with the reason printed on every link, a constellation of entities, eras, rhythms and a story, from a deterministic build-time ETL, with no server and no network calls at run time: every page is static, on GitHub Pages.",
      },
      stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion", "GitHub Pages"],
      year: null, // TODO(akshat): first committed on 2026-11-25, which may be when it was uploaded.
      role: null, // TODO(akshat)
      links: { repo: "https://github.com/akshatsharma-x/MyHub", live: "https://akshatsharma-x.github.io/MyHub/" },
      screenshots: [
        { src: "/work/myhub/01-archive.png", alt: "The MyHUB archive: a decade of receipts read as one person's, with totals and a chart of the years by kind" },
        { src: "/work/myhub/02-story.png", alt: "The story, in beats, opening with nobody wrote any of this down on purpose" },
        { src: "/work/myhub/03-constellation.png", alt: "The constellation: names, artists, places and merchants on a radial graph, linked by shared receipts" },
        { src: "/work/myhub/04-rhythms-light.png", alt: "Rhythms, in the light theme: plays by hour of day, the busiest hour and the emptiest" },
        { src: "/work/myhub/05-receipt.png", alt: "A receipt opened from the roll: a night's listening session with its tracks, details and join keys" },
      ],
      problem: null, // TODO(akshat): the problem it solves, in a sentence or two.
      outcome: { text: "A verification suite drives the production build in headless Chrome at several widths, in both themes, checking overflow, a type floor, keyboard paths, WCAG contrast and layout shift." },
      architecture: {
        nodes: [
          { id: "datasets", label: "Three public datasets" },
          { id: "etl", label: "Build-time ETL", from: "deterministic build-time ETL" },
          { id: "receipts", label: "Receipts" },
          { id: "threads", label: "Threads" },
          { id: "constellation", label: "Constellation" },
          { id: "story", label: "Story" },
          { id: "pages", label: "Static pages", detail: "GitHub Pages", from: "every page is static, on GitHub Pages" },
        ],
        edges: [
          ["datasets", "etl"],
          ["etl", "receipts"],
          ["receipts", "threads"],
          ["threads", "constellation"],
          ["constellation", "story"],
          ["etl", "pages", "dashed"],
        ],
      },
    },
  ],

  // Aliases are other ways content or a visitor writes a skill. Evidence matching and
  // search use them, so "LLM" counts as evidence for LLMs.
  skills: [
    {
      name: "Languages",
      skills: [
        { name: "Python", core: true, icon: "python" },
        { name: "TypeScript", core: true, aliases: ["TS"], icon: "typescript" },
        { name: "Java", core: true },
        { name: "JavaScript", aliases: ["JS"], icon: "javascript" },
        { name: "C/C++", aliases: ["C++"], icon: "cplusplus" },
        { name: "SQL" },
        { name: "Kotlin", icon: "kotlin" },
        { name: "HTML5", aliases: ["HTML"], icon: "html5" },
        { name: "CSS", icon: "css" },
      ],
    },
    {
      name: "AI & ML",
      skills: [
        { name: "generative AI", aliases: ["GenAI"] },
        { name: "LLMs", aliases: ["LLM", "large language models"] },
        { name: "RAG", aliases: ["retrieval-augmented generation"] },
        { name: "HyDE" },
        { name: "FAISS" },
        { name: "Ragas" },
        { name: "LangGraph", core: true, icon: "langgraph" },
        { name: "LangChain", icon: "langchain" },
        { name: "A2A" },
        { name: "multimodal AI", detail: "Gemini Vision", aliases: ["Gemini Vision"] },
        { name: "prompt engineering" },
        { name: "model fine-tuning", aliases: ["fine-tuning"] },
        { name: "deep learning" },
        { name: "Transformers", detail: "BERT", aliases: ["BERT"], icon: "huggingface" },
        { name: "TF-IDF" },
        { name: "TensorFlow", icon: "tensorflow" },
        { name: "KerasTuner" },
        { name: "SMOTE" },
        { name: "PCA" },
      ],
    },
    {
      name: "Data & analytics",
      skills: [
        { name: "pandas", icon: "pandas" },
        { name: "NumPy", icon: "numpy" },
        { name: "PySpark", icon: "apachespark" },
        { name: "EDA", aliases: ["exploratory data analysis"] },
        { name: "ETL" },
        { name: "Power BI" },
        { name: "Advanced Excel", detail: "pivot tables, VLOOKUP, dashboards", aliases: ["Excel"] },
      ],
    },
    {
      name: "Frameworks & backend",
      skills: [
        { name: "Next.js", detail: "App Router", core: true, icon: "nextdotjs" },
        { name: "React", icon: "react" },
        { name: "Node.js", aliases: ["Node"], icon: "nodedotjs" },
        { name: "Express", aliases: ["Express.js"], icon: "express" },
        { name: "Django", icon: "django" },
        { name: "Django REST Framework", aliases: ["DRF"] },
        { name: "FastAPI", core: true, icon: "fastapi" },
        { name: "Streamlit", icon: "streamlit" },
        { name: "Socket.io", icon: "socketdotio" },
        { name: "Tailwind CSS", aliases: ["Tailwind"], icon: "tailwindcss" },
        { name: "REST APIs", aliases: ["REST API", "RESTful APIs"] },
        { name: "JWT", icon: "jsonwebtokens" },
        { name: "Android", detail: "Kotlin", icon: "android" },
      ],
    },
    {
      name: "Platforms & tools",
      skills: [
        { name: "Docker", icon: "docker" },
        { name: "PostgreSQL", aliases: ["Postgres"], icon: "postgresql" },
        { name: "MongoDB", aliases: ["Mongo"], icon: "mongodb" },
        { name: "Oracle Database", aliases: ["Oracle"] },
        { name: "Git", icon: "git" },
        { name: "GitHub", icon: "github" },
        { name: "Postman", icon: "postman" },
        { name: "Linux", icon: "linux" },
        { name: "Windows" },
        { name: "AWS Secrets Manager" },
        { name: "Android Studio", icon: "androidstudio" },
      ],
    },
    {
      name: "Foundations",
      skills: [
        { name: "data structures & algorithms", aliases: ["DSA", "data structures and algorithms"] },
        { name: "operating systems" },
        { name: "relational DBMS", aliases: ["DBMS", "RDBMS"] },
        { name: "OOP", aliases: ["object-oriented programming"] },
        { name: "computer networks" },
        { name: "machine learning", aliases: ["ML"] },
        { name: "SDLC" },
        { name: "debugging" },
        { name: "unit testing", aliases: ["unit tests"] },
        { name: "code review", aliases: ["code reviews"] },
        { name: "Agile" },
      ],
    },
  ],

  // From LinkedIn (2026-11-25), in its order. LinkedIn shows no expiry for any, and its
  // certifications page needs a sign-in, so it isn't a verify URL. TODO(akshat): for each,
  // the issuer's own credential link (a public page to verify it), the missing dates and
  // credential IDs as printed on the certificates, and a line on what it proves. The Smart
  // India Hackathon's internal round is an honor already (achievements), so it isn't here.
  certificates: [
    {
      id: "claude-code-in-action",
      title: "Claude Code in Action",
      issuer: "Anthropic",
      issued: "2026-07",
      expires: "never",
      credentialId: "A3WZHUFAVB2T",
      verifyUrl: null, // TODO(akshat)
      skills: [],
      proves: null, // TODO(akshat)
    },
    {
      id: "red-hat-rh134",
      title: "Red Hat System Administration II (RH134 - RHA) - Ver. 9.3",
      issuer: "Red Hat",
      issued: "2025-03",
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["Linux"],
      proves: null, // TODO(akshat)
    },
    {
      id: "red-hat-rh124",
      title: "Red Hat System Administration I (RH124 - RHA) - Ver. 9.3",
      issuer: "Red Hat",
      issued: "2025-03",
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["Linux"],
      proves: null, // TODO(akshat)
    },
    {
      id: "ibm-containers",
      title: "Introduction to Containers w/ Docker, Kubernetes & OpenShift",
      issuer: "IBM",
      issued: "2026-03",
      expires: "never",
      credentialId: "Z8JB88YRGJCV",
      verifyUrl: null, // TODO(akshat)
      skills: ["Docker"],
      proves: null, // TODO(akshat)
    },
    {
      id: "simplilearn-devops-git",
      title: "Introduction to DevOps and Git for Beginners",
      issuer: "Simplilearn",
      issued: "2026-03",
      expires: "never",
      credentialId: "EO663YJ19PUX",
      verifyUrl: null, // TODO(akshat)
      skills: ["Git"],
      proves: null, // TODO(akshat)
    },
    {
      id: "aws-cloud-practitioner-essentials",
      title: "AWS Cloud Practitioner Essentials",
      issuer: "Amazon Web Services (AWS)",
      issued: "2026-07",
      expires: "never",
      credentialId: "CO9GMSYMB8XC",
      verifyUrl: null, // TODO(akshat)
      skills: [],
      proves: null, // TODO(akshat)
    },
    {
      id: "cisco-network-fundamentals",
      title: "Network Fundamentals",
      issuer: "Cisco",
      issued: null, // TODO(akshat)
      expires: "never",
      credentialId: "UOTYMANQCF0A",
      verifyUrl: null, // TODO(akshat)
      skills: ["computer networks"],
      proves: null, // TODO(akshat)
    },
    {
      id: "coding-ninjas-data-analytics",
      title: "Data Analytics Workshop",
      issuer: "Coding Ninjas 10X Club",
      issued: null, // TODO(akshat)
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["Power BI"],
      proves: null, // TODO(akshat)
    },
    {
      id: "ibm-java",
      title: "Java Programming for Beginners",
      issuer: "IBM",
      issued: "2025-07",
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["Java", "OOP"],
      proves: null, // TODO(akshat)
    },
    {
      id: "oracle-database-design",
      title: "Database Design",
      issuer: "Oracle",
      issued: "2024-11",
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["Oracle Database"],
      proves: null, // TODO(akshat)
    },
    {
      id: "oracle-sql",
      title: "Database Programming with SQL",
      issuer: "Oracle",
      issued: "2024-11",
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["Oracle Database", "SQL"],
      proves: null, // TODO(akshat)
    },
    {
      id: "codechef-dsa-lab",
      title: "Data Structures & Algorithms lab",
      issuer: "CodeChef",
      issued: "2024-11",
      expires: "never",
      credentialId: "6d3d989",
      verifyUrl: null, // TODO(akshat)
      skills: ["data structures & algorithms", "C/C++"],
      proves: null, // TODO(akshat)
    },
    {
      id: "gfg-oop-java",
      title: "Object Oriented Programming Using JAVA",
      issuer: "GeeksforGeeks",
      issued: null, // TODO(akshat)
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["Java", "OOP"],
      proves: null, // TODO(akshat)
    },
    {
      id: "nptel-design-analysis-algorithms",
      title: "Design and analysis of algorithms",
      issuer: "NPTEL",
      issued: "2025-04",
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["data structures & algorithms"],
      proves: null, // TODO(akshat)
    },
    {
      id: "nptel-dsa-java",
      title: "Data Structures and Algorithms using Java",
      issuer: "NPTEL",
      issued: "2024-11",
      expires: "never",
      credentialId: null, // TODO(akshat)
      verifyUrl: null, // TODO(akshat)
      skills: ["data structures & algorithms", "Java"],
      proves: null, // TODO(akshat)
    },
  ],

  achievements: [
    {
      id: "smart-india-hackathon",
      title: "Smart India Hackathon",
      years: [2024, 2025],
      detail: {
        text: "Qualified at the college level in 2024 and 2025, among the top 50 of 300+ teams.",
        footnotes: [6],
      },
      medal: { shape: "rounded-square", face: "Smart India Hackathon", line: "top 50 of 300+" },
    },
    {
      id: "deans-list",
      title: "Dean's List for Academic Excellence",
      org: "Manipal University Jaipur",
      years: [2024],
      medal: { shape: "circle", face: "Dean's List" },
    },
    {
      id: "student-excellence-award",
      title: "Student Excellence Award",
      org: "Manipal University Jaipur",
      years: [2026],
      medal: { shape: "shield", face: "Student Excellence Award" },
    },
  ],

  // The reel cards (Part 6). Each film draws only figures its footnotes state; the
  // schema checks them.
  highlights: [
    {
      id: "cartographer",
      text: "Six documents. Two calls.",
      footnotes: [1],
      ref: { section: "experience", id: "united-airlines" },
      film: { kind: "fan-out", from: 2, to: 6 },
    },
    {
      id: "pennies-a-run",
      text: "Pennies a run.",
      footnotes: [2],
      ref: { section: "experience", id: "united-airlines" },
      film: { kind: "cost", cost: [0.08, 0.11], compression: [22, 25] },
    },
    {
      id: "two-papers",
      text: "Two papers. One conference.",
      source: "SCI-2026, Springer LNNS",
      ref: { section: "research" },
      film: { kind: "papers", conference: "sci-2026" },
    },
    {
      id: "churn-accuracy",
      text: "97% accurate.",
      footnotes: [5],
      ref: { section: "work", id: "churn-prediction" },
      film: { kind: "roc", auc: 0.98 },
    },
    {
      id: "sih-top-50",
      text: "Top 50 of 300+.",
      footnotes: [6],
      ref: { section: "credentials", id: "smart-india-hackathon" },
      film: { kind: "condense", from: 300, to: 50 },
    },
    {
      id: "test-coverage",
      text: "90%+ coverage.",
      footnotes: [4],
      ref: { section: "experience", id: "truechip" },
      film: { kind: "ring", percent: 90 },
    },
    {
      id: "daily-users",
      text: "2,500+ daily users.",
      footnotes: [3],
      ref: { section: "experience", id: "walkingtree" },
      film: { kind: "bars", value: 2500 },
    },
  ],

  footnotes: [
    {
      id: 1,
      note: "Cartographer generates 6 documentation artifacts in 2 LLM calls.",
      source: "United Airlines, 2026.",
    },
    {
      id: 2,
      note: "$0.08–0.11 per run with 22–25% token compression and SHA-256 caching, measured across 35 evaluation scenarios.",
      source: "United Airlines, 2026.",
    },
    {
      id: 3,
      note: "Engazewell: 10,000+ records and 2,500+ daily active users.",
      source: "WalkingTree Technologies, 2025.",
    },
    {
      id: 4,
      note: "90%+ test coverage; ~30% fewer post-integration defects; ~25% faster review turnaround.",
      source: "Truechip Solutions, 2025–26.",
    },
    {
      id: 5,
      note: "Stacking ensemble: 97% accuracy, 0.98 ROC-AUC.",
      source: null, // TODO(akshat): the dataset and evaluation split.
    },
    {
      id: 6,
      // The note names its own source.
      note: "Smart India Hackathon, college-level round: top 50 of 300+ teams, in 2024 and 2025.",
    },
    {
      id: 7,
      note: "ResearchX's pipeline is a LangGraph graph of 17 agents.",
      source: "ResearchX's README, github.com/akshatsharma-x/ResearchX.",
    },
    {
      id: 8,
      note: "CV-Scan, held-out evaluation: hybrid category accuracy 0.786, against 0.704 for TF-IDF alone; job-to-resume ranking ROC-AUC 0.892; 2,361 historical resumes in the benchmark pool; 24 domains.",
      source: "CV-Scan's README, github.com/akshatsharma-x/cv-scan.",
    },
    {
      id: 9,
      note: "BBC News Retrieval: 25 topics with 957 graded relevance judgments; hybrid MAP 0.811; on 2,066 known-item queries, hybrid MRR 0.812, ahead of every other model.",
      source: "BBC News Retrieval's README and report, github.com/akshatsharma-x/BBC-News-Retrieval.",
    },
    {
      id: 10,
      note: "Vistara's score runs 300–900, and coherence across its signals carries 25% of it.",
      source: "Vistara's README, github.com/akshatsharma-x/Vistara.",
    },
  ],

  copy: {
    skip: "Skip to content",
    hero: {
      ctaWork: "See my work",
      ctaHello: "Say hello ›",
      facts: { label: "Key facts", now: "Now", studying: "Studying", presented: "Presented", finish: "Finish" },
    },
    statement: {
      headline:
        "Intelligent systems are everywhere. Clear ones are rare. I build the clear kind — LLM pipelines that document code, models that explain their predictions, and software that works for everyone.",
      emphasis: "the clear kind",
    },
    about: {
      headline: "Hi, I'm Akshat.",
      currently: "Currently",
      glance: "At a glance",
      // A visitor's working day, for the local-time tile's overlap with Akshat's hours.
      visitorDay: { start: "09:00", end: "17:00" },
    },
    highlights: { eyebrow: "The highlights." },
    experience: {
      headline: "Experience.",
      sub: "Four internships. One through-line: making complex systems clear.",
    },
    research: {
      headline: "Research.",
      sub: "Machine learning for the food we save and the air we breathe.",
      caption: "Illustration of the idea, not results from the paper",
      presentedBy: "Presented by {name}",
    },
    work: {
      headline: "Work.",
      sub: "Built to be used. Designed to be understood.",
      filterLabel: "Show projects",
      filters: [
        { id: "all", label: "All", categories: ["AI system", "Full-stack", "NLP", "Machine learning", "Accessibility"] },
        { id: "ai", label: "AI", categories: ["AI system", "NLP"] },
        { id: "full-stack", label: "Full-stack", categories: ["Full-stack"] },
        { id: "ml", label: "ML", categories: ["Machine learning", "NLP"] },
        { id: "accessibility", label: "Accessibility", categories: ["Accessibility"] },
      ],
      caseStudy: {
        chapters: { problem: "The problem.", approach: "The approach.", outcome: "The outcome.", built: "Built with." },
        facts: { year: "Year", role: "Role", stack: "Stack" },
        architecture: "How it fits together",
        links: { repo: "Code", live: "Live site" },
        next: "Next project",
        back: "Work",
        notes: "Notes",
      },
    },
    skills: {
      headline: "The stack.",
      sub: "Engineered in layers.",
      chip: {
        label: "A chip exploded into six layers of skills",
        layers: ["AI & ML", "Data & analytics", "Frameworks & backend", "Languages", "Platforms & tools", "Foundations"],
        unit: { one: "skill", other: "skills" },
        cores: "Light up the cores",
      },
      core: { headline: "The core six.", usedIn: "Used in" },
      views: { label: "Show every skill as", specs: "Specs", cloud: "Cloud" },
      showMe: { jump: "Jump to", none: "Not named in a role, project or paper yet", clear: "Show all" },
      specsLink: "See full tech specs",
    },
    specs: {
      headline: "Tech specs.",
      sub: "Every skill, by category, with the education behind it.",
      education: "Education",
      coursework: "Coursework",
      back: "Skills",
    },
    credentials: {
      headline: "Credentials.",
      headlineWithoutCertificates: "Education.",
      honors: "Recognition.",
      wallet: {
        label: "Passes",
        education: "Education",
        certificate: "Certificate",
        classOf: "Class of",
        grade: "Grade",
        issued: "Issued",
        credentialId: "Credential ID",
        skills: "Skills covered",
        proves: "What it proves",
        verify: "Verify",
        expires: "Expires",
        expired: "Expired",
        never: "Never",
        coursework: "Coursework",
        flip: "Show the back",
        scan: "Scan to verify",
      },
      medals: { label: "Honors", flip: "Turn over", medal: "medal" },
    },
    contact: {
      headline: "Let's build something clear.",
      clock: "It's {time} {place}",
      overlap: "Our working hours overlap {from}–{to} your time",
      noOverlap: "I'll see it first thing in my morning",
      dock: {
        label: "Ways to reach me",
        email: "Email",
        linkedin: "LinkedIn",
        github: "GitHub",
        resume: "Résumé",
        copied: "Email copied",
        notCopied: "Couldn't copy the email",
        openMail: "Open mail app",
      },
      thread: {
        label: "Write to me",
        greeting: "Hi — what are you working on?",
        akshat: "Akshat",
        you: "You",
        name: "Name",
        email: "Email",
        message: "Message",
        send: "Send",
        sending: "Sending",
        delivered: "Delivered",
        sent: "Message sent",
        fallback: "Send it from your mail app instead",
        nojs: "Write to me at",
        subject: "Hello from your site",
        errors: {
          nameRequired: "What should I call you?",
          nameLong: "That's longer than any name I know. Could you shorten it?",
          emailRequired: "I'll need an email to write back to.",
          emailInvalid: "That email doesn't look quite right.",
          emailLong: "That email is longer than any I know.",
          messageRequired: "Tell me a little about it.",
          messageLong: "That's a lot to read. Could you trim it a little?",
          rate: "That's a few messages already. Try again in an hour, or send it another way.",
          unavailable: "I can't take messages here right now.",
          failed: "That didn't go through.",
        },
      },
    },
    footer: {
      credit: "Designed and built by Akshat Sharma in India.",
      notes: "Notes",
      map: "Site map",
      pages: { specs: "Specs", colophon: "Colophon" },
      settings: "Settings",
      cookies: "This site uses no cookies.",
      copyright: "© {year} Akshat Sharma",
    },
    colophon: {
      headline: "Colophon.",
      sub: "How this site is built.",
      rows: [
        { label: "Framework", items: ["Next.js 16, with the App Router, Cache Components and Partial Prefetching", "React 19", "TypeScript, in strict mode"] },
        { label: "Styling", items: ["Tailwind CSS 4, on CSS variables", "Continuous corners, where the browser supports them"] },
        { label: "Type", items: ["SF Pro, New York and SF Mono on Apple devices", "Inter, Newsreader and JetBrains Mono elsewhere", "Every face served from this site, never from a font service"] },
        { label: "Motion", items: ["GSAP's SplitText for the Resolve", "Springs driven by time, never by frames"] },
        {
          label: "Cursor",
          items: [
            "Always findable: a dot in whichever ink shows against what's under it",
            "No lag: the dot is where the pointer is, and only the shape around it springs",
            "The system's own cursor for typing, for touch, in forced colors and whenever it's asked for",
          ],
        },
        {
          label: "3D",
          items: [
            "three.js, React Three Fiber and drei",
            "One WebGL context for the whole site",
            "Procedural models in studio light: nothing downloaded",
            "Only where the device draws it smoothly, with posters everywhere else",
          ],
        },
        { label: "Content", items: ["One typed file, checked with zod at every build", "Every number with its footnote"] },
        { label: "Contact", items: ["Resend for delivery", "Upstash for the rate limit"] },
        { label: "Ask", items: ["Claude, through Anthropic's API", "Answers from the site's own content, each claim cited", "The site's own text when it can't answer"] },
        {
          label: "Privacy",
          items: [
            "No cookies",
            "No phone number, anywhere",
            "Vercel Web Analytics, without cookies: visits, and when a section is reached, a case study opened, a message sent or Ask used, never what was written",
          ],
        },
        { label: "Security", items: ["A strict content security policy: only the site's own scripts run", "Keys only in the server's environment"] },
        { label: "Testing", items: ["Vitest", "Playwright, in WebKit first", "axe-core", "Lighthouse CI and size-limit on every pull request"] },
      ],
      budgets: {
        label: "Budgets",
        budget: "Budget",
        home: "Home page",
        metrics: {
          javascript: "First-load JavaScript",
          performance: "Performance",
          accessibility: "Accessibility",
          bestPractices: "Best practices",
          seo: "SEO",
          lcp: "Largest Contentful Paint",
          cls: "Cumulative Layout Shift",
        },
        units: { kb: "{value} KB", seconds: "{value} s" },
        measured: {
          local: "Lighthouse {version} on its phone profile, with throttling, on a production build, {date}.",
          live: "Lighthouse {version} on its phone profile, with throttling, at {host}, {date}.",
        },
        javascript: "JavaScript as this build counts it, in KB of gzip.",
      },
      accessibility: {
        label: "Accessibility",
        statement: [
          "This site aims for WCAG 2.2 at level AA, and every pull request is tested for it.",
          "axe finds nothing on any page, in either theme, on a phone or a desktop, with motion or without. Every pairing of text and its background is tested for contrast, and every target is at least 44 points.",
          "The whole site works with a keyboard, along a written path that runs as a test in Safari's engine and in Chrome's. Anything that moves for more than five seconds can be paused.",
          "Reduced motion, reduced transparency, increased contrast and forced colors each get an edition of their own, and so do phones, print, reader views and browsers without JavaScript.",
        ],
        gaps: {
          label: "Known gaps",
          items: ["A reader view leaves out five of the seven highlights and the skills' lists. Experience and /specs give both in full."],
        },
        contact: "If something here doesn't work for you, write to {email}.",
      },
      things: {
        label: "Things to find",
        show: "Show the things to find",
        hide: "Hide them again",
        items: {
          "hero-lens": { name: "The loupe", find: "Move the pointer over the name at the top. With a portrait, the ƒ button sets the background's blur." },
          "devanagari-name": { name: "अक्षत", find: "Click the name at the top." },
          "glance-flips": { name: "Two flips", find: "At a glance, click Studying for the days to graduation, and Local time for 12- or 24-hour time." },
          "edit-shuttle": { name: "Play the edit", find: "Focus a clip in Experience, then press Space, or J, K and L." },
          "clear-skies": { name: "Clear skies", find: "Drag the air-quality forecast's handle all the way right." },
          "core-ripple": { name: "A ripple of cores", find: "Press the chip's die in Skills." },
          "show-me-where": { name: "Show me where", find: "Choose a skill in Skills." },
          "medal-glint": { name: "A glint", find: "Flick a medal hard." },
          "dock-bounce": { name: "The bounce", find: "Open anything from the dock in Contact." },
          delivered: { name: "Delivered", find: "Send a message from Contact." },
          "command-hello": { name: "Hello", find: "Search for \"hello\"." },
          "command-941": { name: "9:41", find: "Search for \"9:41\"." },
          "command-sudo": { name: "Permission", find: "Search for \"sudo hire akshat\"." },
          "command-compare": { name: "Compare", find: "Search for \"compare\"." },
          "command-retro": { name: "Retro", find: "Search for \"retro\"." },
          "command-clarity": { name: "Clarity", find: "Search for \"clarity\"." },
          "design-grid": { name: "The grid", find: "Press G." },
          "focus-mode": { name: "Focus mode", find: "Press F, and Esc to leave." },
          "resume-edition": { name: "The résumé edition", find: "Print any page." },
          "console-hello": { name: "A note for engineers", find: "Open the console." },
          "compare-page": { name: "Compare Akshat models", find: "Visit /compare." },
          "not-found": { name: "Out of focus", find: "Visit a page that doesn't exist." },
        },
      },
    },
    surprises: {
      devanagari: { name: "अक्षत", note: "Sanskrit for 'unbroken'" },
      clearSkies: "Clear skies ahead.",
      commands: {
        hello: { phrase: "hello", label: "Say hello", answer: "Hello to you too." },
        nineFortyOne: { phrase: "9:41", label: "Set every clock to 9:41", answer: "9:41" },
        sudo: { phrase: "sudo hire akshat", label: "Hire Akshat", answer: "Permission granted." },
        compare: { phrase: "compare", label: "Compare Akshat models" },
        retro: { phrase: "retro", label: "Open the RETROGRADE edition" },
        clarity: { phrase: "clarity", label: "Bring everything into focus" },
      },
      console: { greeting: "Hi, fellow engineer." },
      notFound: { headline: "This page is out of focus.", sub: "Whatever was here isn't anymore, or never was.", action: "Bring it into focus" },
      compare: {
        headline: "Compare Akshat models.",
        picker: "Year",
        none: "None",
        footnote: "Derived from dated entries; nothing estimated.",
        rows: { studying: "Studying", internships: "Internships to date", papers: "Papers", honors: "Honors", stack: "Joined the stack" },
      },
    },
    ask: {
      label: "Ask",
      hint: "Answered from this site",
      suggestions: [
        "What does Akshat do at United Airlines?",
        "Which projects use RAG?",
        "What is the research about?",
        "How do I get in touch?",
      ],
      sources: "Sources",
      answering: "Answering",
      fallback: {
        unavailable: "Ask isn't answering right now, so here's what the site itself says.",
        rate: "That's a lot of questions for one minute, so here's what the site itself says.",
        offline: "You're offline, so here's what the site itself says.",
        nothing: "Nothing on the site answers that. Akshat can, though.",
      },
      declined: "Ask can't answer that one. Akshat can, though.",
      contact: "Get in touch",
    },
  },

  // TODO(akshat): approve these drafts, then remove each path once its copy is final.
  drafts: ["profile.role", "profile.headline", "profile.bio", "publications.*.tldr", "projects.*.outcome", "copy"],
} satisfies ContentInput;
