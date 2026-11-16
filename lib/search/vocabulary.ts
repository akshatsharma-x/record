/**
 * Search vocabulary (DESIGN.md §6.3): what a visitor might type, mapped to the words the
 * content uses for the same idea. It adds no facts; it only says which terms mean the same
 * thing. Skill aliases from content/data.ts ("LLM" for LLMs) are already in the index;
 * this covers domain synonyms the content doesn't spell out.
 *
 * - "rag" also reaches grounding on knowledge graphs (GraphRAG): Cartographer at United
 *   Airlines generates on top of a code knowledge graph.
 * - "llm" reaches the models and frameworks by name.
 */
export const VOCABULARY: Record<string, readonly string[]> = {
  rag: ["retrieval-augmented generation", "knowledge graphs", "vector search", "FAISS", "HyDE"],
  retrieval: ["RAG", "knowledge graphs", "FAISS", "HyDE"],
  graphrag: ["knowledge graphs", "RAG"],
  llm: ["large language models", "LLMs", "GPT", "Claude", "Gemini", "LangGraph", "LangChain", "generative AI"],
  genai: ["generative AI", "LLMs", "Gemini", "GPT", "Claude"],
  agents: ["multi-agent", "A2A", "LangGraph", "orchestrator"],
  agentic: ["multi-agent", "A2A", "LangGraph", "orchestrator"],
  nlp: ["natural language processing", "Transformers", "BERT", "TF-IDF"],
  xai: ["explainability", "interpretable", "SHAP", "XAI"],
  interpretability: ["interpretable", "explainability", "XAI"],
  frontend: ["React", "Next.js", "Tailwind CSS", "HTML5", "UI"],
  backend: ["Django REST Framework", "FastAPI", "Node.js", "Express", "Core Java", "REST APIs"],
  database: ["PostgreSQL", "MongoDB", "Oracle Database", "DBMS"],
  a11y: ["accessibility", "WCAG", "ARIA"],
  resume: ["print the résumé edition"],
  cv: ["print the résumé edition"],
  hire: ["contact", "email"],
  email: ["contact", "copy email"],
  dark: ["theme"],
  light: ["theme"],
  color: ["finish"],
  colour: ["finish"],
  accent: ["finish"],
  cursor: ["larger cursor", "system cursor"],
  shortcuts: ["single-key shortcuts"],
  keyboard: ["single-key shortcuts"],
};

/** The vocabulary for a typed word, singular or plural. */
export function expansions(term: string): readonly string[] {
  return VOCABULARY[term] ?? (term.endsWith("s") ? (VOCABULARY[term.slice(0, -1)] ?? []) : []);
}
