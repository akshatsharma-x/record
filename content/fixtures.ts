/**
 * Fixture certificates (DESIGN.md §7.8), for the kitchen's full wallet and the tests that
 * prove a certificate added to content becomes a pass with no code change. Plainly made up,
 * at example.com: never shown on the site.
 *
 * Runs under plain Node for tests: no path aliases.
 */
import { data } from "./data.ts";
import type { Content, ContentInput } from "./schema.ts";
import { parseContent } from "./schema.ts";

export const FIXTURE_CERTIFICATES: NonNullable<ContentInput["certificates"]> = [
  {
    id: "fixture-cloud",
    title: "Cloud Practitioner (fixture)",
    issuer: "Example Academy",
    issued: "2026-03",
    expires: "2029-03",
    credentialId: "EX-CLD-7Q4K",
    verifyUrl: "https://example.com/verify/EX-CLD-7Q4K",
    skills: ["Docker", "Linux", "PostgreSQL"],
    proves: "Can deploy and run a containerized service in the cloud (fixture).",
  },
  {
    id: "fixture-ml",
    title: "Machine Learning Specialization (fixture)",
    issuer: "Example University Online",
    tone: "#1f4f7a",
    issued: "2025-08",
    expires: "never",
    credentialId: "EXU-ML-2025-0815",
    verifyUrl: "https://example.com/certificates/EXU-ML-2025-0815",
    skills: ["machine learning", "TensorFlow", "Python"],
    proves: "Supervised and unsupervised learning, end to end (fixture).",
  },
  {
    id: "fixture-expired",
    title: "Data Analysis Bootcamp (fixture)",
    issuer: "Example Institute",
    tone: "#6b3f1d",
    issued: "2023-01",
    expires: "2025-01",
    credentialId: null,
    verifyUrl: null,
    skills: ["pandas", "SQL"],
    proves: null,
  },
];

/** The content as it would be with certificates: the real content plus these. */
export function withCertificates(certificates = FIXTURE_CERTIFICATES): Content {
  return parseContent({ ...structuredClone(data), certificates });
}
