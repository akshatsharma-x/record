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
    now: "united-airlines",
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
    },
    resumePdf: null, // TODO(akshat): a résumé PDF without the phone number. Until then, no download.
    // TODO(akshat): a portrait, at least 3000px tall, with soft side light and a plain
    // background, framed head and shoulders with the top of the head about 15–20% from
    // the top. Make two layers from it (DESIGN.md §7, Part 5): the subject cut out with
    // alpha, and the background plate with Akshat removed. Put both in /public and
    // describe them here, with headTop (where the top of the head sits, as a share of
    // the height); the hero's portrait edition switches on by itself.
    photo: null,
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
      id: "united-airlines",
      org: "United Airlines",
      role: "AI & ML Intern (Generative AI)",
      kind: "internship",
      start: "2026-06",
      end: "present",
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
      stack: ["LangGraph", "GPT-4.1", "Claude Sonnet 4.5", "knowledge graphs"],
      confidential: {
        note: "Internal work. Keep the visuals abstract and show nothing beyond the résumé.",
        shareable: null, // TODO(akshat): confirm what's shareable.
      },
    },
    {
      id: "ey",
      org: "Ernst & Young (EY)",
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
      stack: ["Java", "OOP", "unit testing", "Git"],
    },
    {
      id: "walkingtree",
      org: "WalkingTree Technologies",
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
      tldr: "An AI framework that predicts food waste in cold-chain logistics, and explains each prediction so the waste can be prevented.",
      keywords: ["interpretable AI", "explainable ML", "food waste", "cold-chain logistics", "sustainability"],
      presentedAt: "sci-2026",
      coAuthors: null, // TODO(akshat)
      abstract: null, // TODO(akshat)
      doi: null, // TODO(akshat)
      pdf: null, // TODO(akshat): PDF rights
    },
    {
      slug: "pm25-forecasting",
      title: "Short-Term PM2.5 Forecasting Using ML for Sustainable Urban Air Quality",
      tldr: "Machine-learning models that forecast fine-particle air pollution a short time ahead, so cities can act on air quality sooner.",
      keywords: ["PM2.5", "air quality", "time-series forecasting", "machine learning", "sustainability"],
      presentedAt: "sci-2026",
      coAuthors: null, // TODO(akshat)
      abstract: null, // TODO(akshat)
      doi: null, // TODO(akshat)
      pdf: null, // TODO(akshat): PDF rights
    },
  ],

  projects: [
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
    },
    {
      slug: "quizmuj",
      name: "QuizMUJ",
      tagline: { text: "A real-time learning management system" },
      category: "Full-stack",
      summary: {
        text: "Role-based examination platform (Node.js, Express, MongoDB, Tailwind CSS); a real-time Live Exam Room on Socket.io with proctoring such as browser tab-switch tracking; Docker; admin tools including CSV bulk upload and an analytics API for exporting results; secure session handling and data integrity.",
      },
      stack: ["Node.js", "Express", "MongoDB", "Tailwind CSS", "Socket.io", "Docker"],
      year: null, // TODO(akshat)
      role: null, // TODO(akshat)
      links: null, // TODO(akshat): repo and live links
      screenshots: null, // TODO(akshat)
    },
    {
      slug: "resume-screening",
      name: "Automated Resume Screening",
      tagline: { text: "Candidate classification with an explainability dashboard" },
      category: "NLP",
      summary: {
        text: "NLP screening (Python, Streamlit, Transformers) for automated classification and data extraction; a hybrid TF-IDF + BERT model with an optimized weighted ensemble for candidate matching; an XAI dashboard with PCA visualizations.",
      },
      stack: ["Python", "Streamlit", "Transformers", "TF-IDF", "BERT", "PCA"],
      year: null, // TODO(akshat)
      role: null, // TODO(akshat)
      links: null, // TODO(akshat): repo and live links
      screenshots: null, // TODO(akshat)
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
      links: null, // TODO(akshat): repo and live links
      screenshots: null, // TODO(akshat)
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
    },
  ],

  // Aliases are other ways content or a visitor writes a skill. Evidence matching and
  // search use them, so "LLM" counts as evidence for LLMs.
  skills: [
    {
      name: "Languages",
      skills: [
        { name: "Python", core: true },
        { name: "TypeScript", core: true, aliases: ["TS"] },
        { name: "Java", core: true },
        { name: "JavaScript", aliases: ["JS"] },
        { name: "C/C++", aliases: ["C++"] },
        { name: "SQL" },
        { name: "Kotlin" },
        { name: "HTML5", aliases: ["HTML"] },
        { name: "CSS" },
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
        { name: "LangGraph", core: true },
        { name: "LangChain" },
        { name: "A2A" },
        { name: "multimodal AI", detail: "Gemini Vision", aliases: ["Gemini Vision"] },
        { name: "prompt engineering" },
        { name: "model fine-tuning", aliases: ["fine-tuning"] },
        { name: "deep learning" },
        { name: "Transformers", detail: "BERT", aliases: ["BERT"] },
        { name: "TF-IDF" },
        { name: "TensorFlow" },
        { name: "KerasTuner" },
        { name: "SMOTE" },
        { name: "PCA" },
      ],
    },
    {
      name: "Data & analytics",
      skills: [
        { name: "pandas" },
        { name: "NumPy" },
        { name: "PySpark" },
        { name: "EDA", aliases: ["exploratory data analysis"] },
        { name: "ETL" },
        { name: "Power BI" },
        { name: "Advanced Excel", detail: "pivot tables, VLOOKUP, dashboards", aliases: ["Excel"] },
      ],
    },
    {
      name: "Frameworks & backend",
      skills: [
        { name: "Next.js", detail: "App Router", core: true },
        { name: "React" },
        { name: "Node.js", aliases: ["Node"] },
        { name: "Express", aliases: ["Express.js"] },
        { name: "Django" },
        { name: "Django REST Framework", aliases: ["DRF"] },
        { name: "FastAPI", core: true },
        { name: "Streamlit" },
        { name: "Socket.io" },
        { name: "Tailwind CSS", aliases: ["Tailwind"] },
        { name: "REST APIs", aliases: ["REST API", "RESTful APIs"] },
        { name: "JWT" },
        { name: "Android", detail: "Kotlin" },
      ],
    },
    {
      name: "Platforms & tools",
      skills: [
        { name: "Docker" },
        { name: "PostgreSQL", aliases: ["Postgres"] },
        { name: "MongoDB", aliases: ["Mongo"] },
        { name: "Oracle Database", aliases: ["Oracle"] },
        { name: "Git" },
        { name: "GitHub" },
        { name: "Postman" },
        { name: "Linux" },
        { name: "Windows" },
        { name: "AWS Secrets Manager" },
        { name: "Android Studio" },
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

  // TODO(akshat): for each certificate, the title, issuer, issue date, expiry, credential ID,
  // a public verify URL, the skills covered and what it proves.
  certificates: [],

  achievements: [
    {
      id: "smart-india-hackathon",
      title: "Smart India Hackathon",
      years: [2024, 2025],
      detail: {
        text: "Qualified at the college level in 2024 and 2025, among the top 50 of 300+ teams.",
        footnotes: [6],
      },
    },
    {
      id: "deans-list",
      title: "Dean's List for Academic Excellence",
      org: "Manipal University Jaipur",
      years: [2024],
    },
    {
      id: "student-excellence-award",
      title: "Student Excellence Award",
      org: "Manipal University Jaipur",
      years: [2026],
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
  ],

  copy: {
    hero: { ctaWork: "See my work", ctaHello: "Say hello ›" },
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
    },
    work: { headline: "Work.", sub: "Built to be used. Designed to be understood." },
    skills: { headline: "The stack.", sub: "Engineered in layers." },
    credentials: {
      headline: "Credentials.",
      headlineWithoutCertificates: "Education.",
      honors: "Recognition.",
    },
    contact: { headline: "Let's build something clear." },
    footer: { credit: "Designed and built by Akshat Sharma in India." },
  },

  // TODO(akshat): approve these drafts, then remove each path once its copy is final.
  drafts: ["profile.role", "profile.headline", "profile.bio", "publications.*.tldr", "copy"],
} satisfies ContentInput;
