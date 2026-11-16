"use client";

import { Check, Mail, Palette, Quote, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Activity, island } from "@/lib/island/store";
import { openSearch } from "@/lib/search/store";

/** The activities other parts send the Island (DESIGN.md §6.2), to see and to test. */
const examples = (email: string): Activity[] => [
  { icon: Check, title: "Email copied", detail: email, tone: "success" },
  { icon: Quote, title: "Citation copied", tone: "success" },
  { icon: Palette, title: "Finish: Pink City", tone: "accent" },
  { icon: Send, title: "Message sent", tone: "success" },
  { icon: Sparkles, title: "You found one ✦", tone: "accent" },
];

export function IslandLab({ email }: { email: string }) {
  const EXAMPLES = examples(email);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {EXAMPLES.map((activity) => (
          <Button key={activity.title} variant="secondary" onClick={() => island.show(activity)}>
            {activity.title}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => EXAMPLES.slice(0, 3).forEach((activity) => island.show(activity))}>Fire three at once</Button>
        <Button variant="secondary" onClick={() => island.show({ icon: Mail, title: "Couldn't send", detail: "Try again", tone: "error" })}>
          An error
        </Button>
        <Button variant="secondary" onClick={() => openSearch()}>
          Open Search
        </Button>
      </div>
    </div>
  );
}
