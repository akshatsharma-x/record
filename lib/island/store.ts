import type { LucideIcon } from "lucide-react";
import { create } from "zustand";

/**
 * The Island's state (DESIGN.md §6.2): whether it's expanded, and the activities it shows.
 *
 * Other parts confirm things through it:
 *
 *   island.show({ icon: Check, title: "Email copied", detail: email, tone: "success" })
 *
 * The pill grows into a wider capsule for 2.2s, then returns. Activities that arrive while
 * one is showing wait their turn; the same message twice in a row extends the one showing
 * instead of repeating. While the Island is expanded, the clock stops and the queue waits.
 */
export type ActivityTone = "neutral" | "accent" | "success" | "error";

export interface Activity {
  icon?: LucideIcon;
  title: string;
  detail?: string;
  tone?: ActivityTone;
  /** A link the activity offers, such as "Show me where"'s jump (DESIGN.md §7.7). */
  action?: { label: string; href: string };
  /** Stays until dismissed rather than for 2.2s: an activity that lasts as long as a mode. */
  persist?: boolean;
}

export interface QueuedActivity extends Activity {
  key: number;
  tone: ActivityTone;
}

/** Milliseconds (§6.2): how long an activity shows, the hover intent and the leave grace. */
export const ISLAND_TIMING = { activity: 2200, intent: 120, grace: 300 } as const;
const ACTIVITY_MS = ISLAND_TIMING.activity;

interface IslandState {
  expanded: boolean;
  current: QueuedActivity | null;
  queue: QueuedActivity[];
}

export const useIsland = create<IslandState>(() => ({ expanded: false, current: null, queue: [] }));

let timer: ReturnType<typeof setTimeout> | undefined;
let nextKey = 1;

function schedule() {
  clearTimeout(timer);
  const { expanded, current } = useIsland.getState();
  if (!expanded && current && !current.persist) timer = setTimeout(advance, ACTIVITY_MS);
}

function advance() {
  const [head, ...rest] = useIsland.getState().queue;
  useIsland.setState({ current: head ?? null, queue: rest });
  schedule();
}

function same(a: Activity, b: Activity) {
  return a.title === b.title && (a.detail ?? "") === (b.detail ?? "");
}

export const island = {
  show(activity: Activity) {
    const { current, queue } = useIsland.getState();
    const last = queue.at(-1) ?? current;
    if (last && same(last, activity)) {
      // The same news again: keep it up rather than say it twice.
      if (last === current) schedule();
      return;
    }
    const item: QueuedActivity = { ...activity, tone: activity.tone ?? "neutral", key: nextKey++ };
    if (current) {
      useIsland.setState({ queue: [...queue, item] });
      return;
    }
    useIsland.setState({ current: item });
    schedule();
  },
  /** Ends an activity that persists (or any with this title), showing the next one. */
  dismiss(title: string) {
    const { current, queue } = useIsland.getState();
    if (current?.title === title) advance();
    else useIsland.setState({ queue: queue.filter((item) => item.title !== title) });
  },
};

/** Expanding stops the clock; collapsing gives the current activity its full time again. */
export function setIslandExpanded(expanded: boolean) {
  if (useIsland.getState().expanded === expanded) return;
  useIsland.setState({ expanded });
  schedule();
}

/** For tests: back to an empty, collapsed Island. */
export function resetIsland() {
  clearTimeout(timer);
  useIsland.setState({ expanded: false, current: null, queue: [] });
}
