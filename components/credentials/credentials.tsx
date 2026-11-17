import type { ReactNode } from "react";
import { Behavior } from "@/components/ui/behavior";
import { Container, Section } from "@/components/ui/layout";
import { Display } from "@/components/ui/type";
import { content } from "@/content";
import { medals, wallet } from "@/content/derive";
import { Medals } from "./medals";
import type { PassMarks } from "./pass";
import { Wallet } from "./wallet";

/**
 * Credentials & honors (DESIGN.md §7.8): the wallet, Education first and then each
 * certificate as a pass, beside the medals. The headline is content's: "Credentials."
 * with a certificate, "Education." without one, never a count.
 */
export function Credentials({ marks = {} }: { marks?: PassMarks & Record<string, ReactNode> }) {
  const { headline, passes } = wallet(content);
  return (
    <Section id="credentials" name="Credentials" surface="dark" className="credentials" aria-labelledby="credentials-title">
      <Container className="credentials-body">
        <Display id="credentials-title" className="credentials-title">
          {headline}
        </Display>
        <Wallet passes={passes} marks={marks} />
        <Medals medals={medals(content)} marks={marks} />
      </Container>
      <Behavior section="credentials" />
    </Section>
  );
}
