"use client";

import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { warmSearch } from "@/components/search/warm";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cx } from "@/lib/cx";
import { ISLAND_TIMING, setIslandExpanded, useIsland } from "@/lib/island/store";
import { durations } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { openSearch } from "@/lib/search/store";
import { SECTIONS } from "@/lib/sections";
import { isApplePlatform } from "@/lib/shortcuts";
import { useSurface } from "@/lib/stores/surface";

const NAV = SECTIONS.filter((section) => section.nav);

type Size = { width: number; height: number };

/** The natural size of a view, so the shell can spring to it. */
function useSize(ref: RefObject<HTMLElement | null>): Size | null {
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      const next = box
        ? { width: box.inlineSize, height: box.blockSize }
        : { width: element.offsetWidth, height: element.offsetHeight };
      setSize((last) => (last && last.width === next.width && last.height === next.height ? last : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

const noSubscription = () => () => {};

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere; the server renders the Apple hint. */
function useShortcutHint(): string {
  return useSyncExternalStore(
    noSubscription,
    () => (isApplePlatform() ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );
}

/** The nav section that contains the current section: About and Highlights belong to Overview. */
function currentNav(section: string | null): string | null {
  const index = SECTIONS.findIndex((entry) => entry.id === section);
  if (index === -1) return null;
  for (let i = index; i >= 0; i--) if (SECTIONS[i].nav) return SECTIONS[i].id;
  return null;
}

/**
 * The Island (DESIGN.md §6.2): the primary nav, the section indicator, the scroll progress
 * and the place where confirmations appear. A black pill at the top center that hugs its
 * content and springs on the island spring.
 *
 * - Collapsed: the monogram, the current section's name and a scroll-progress ring.
 * - Expanded on hover (after an intent delay), click, tap or keyboard focus: the seven
 *   section links, Search, the theme toggle and "Say hello". Escape, a click outside or the
 *   pointer leaving (after a grace period) collapses it. On phones it's a full-width sheet.
 * - Activities from island.show() grow it into a wider capsule, one at a time, and are
 *   announced through a visually hidden status.
 * - It's a real <nav> with real anchors: without JavaScript it renders expanded.
 */
export function Island({ initials }: { initials: string }) {
  const pathname = usePathname();
  const menuId = useId();
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGSVGElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const capsule = useRef<HTMLDivElement>(null);
  const timers = useRef({ intent: 0, grace: 0 });
  const openedBy = useRef<"hover" | "click" | "focus" | null>(null);

  const expanded = useIsland((state) => state.expanded);
  const activity = useIsland((state) => state.current);
  const section = useSurface((state) => state.section);
  const name = useSurface((state) => state.name) ?? SECTIONS.find((entry) => entry.id === section)?.name ?? null;
  const current = pathname === "/" ? currentNav(section) : null;
  const hint = useShortcutHint();

  // The name swaps with a blur-crossfade: the old one fades out on top of the new one.
  const [shown, setShown] = useState(name);
  const [leaving, setLeaving] = useState<string | null>(null);
  if (name !== shown) {
    setLeaving(shown);
    setShown(name);
  }
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(null), durations.swap);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const sizes = {
    collapsed: useSize(bar),
    expanded: useSize(panel),
    activity: useSize(capsule),
  };
  const view = expanded ? "expanded" : activity ? "activity" : "collapsed";
  const size = sizes[view] ?? sizes.collapsed;
  const shellStyle = size
    ? ({
        width: size.width,
        height: size.height,
        "--island-bar-width": `${sizes.collapsed?.width ?? 0}px`,
      } as CSSProperties)
    : undefined;

  // ─── Expanding and collapsing ──────────────────────────────────────────────

  // These touch only refs and the store, so they're stable across renders.
  const clearTimers = useCallback(() => {
    window.clearTimeout(timers.current.intent);
    window.clearTimeout(timers.current.grace);
  }, []);

  const expand = useCallback(
    (reason: "hover" | "click" | "focus") => {
      clearTimers();
      openedBy.current = reason;
      warmSearch();
      setIslandExpanded(true);
    },
    [clearTimers],
  );

  const collapse = useCallback(
    (returnFocus = false) => {
      clearTimers();
      openedBy.current = null;
      if (returnFocus && nav.current?.contains(document.activeElement)) toggle.current?.focus();
      setIslandExpanded(false);
    },
    [clearTimers],
  );

  const keyboardFocusInside = useCallback(() => {
    const active = document.activeElement;
    return Boolean(active && nav.current?.contains(active) && active.matches(":focus-visible"));
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) collapse();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") collapse(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  });

  // A navigation elsewhere collapses it.
  useEffect(() => {
    setIslandExpanded(false);
  }, [pathname]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Native listeners, not React's onPointerEnter: React derives enter and leave from the
  // element the pointer came from, and skips the event while that part of the page is still
  // hydrating, which would lose a hover in the first moments after load.
  useEffect(() => {
    const element = nav.current;
    if (!element) return;
    const enter = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      warmSearch();
      window.clearTimeout(timers.current.grace);
      if (!useIsland.getState().expanded) {
        timers.current.intent = window.setTimeout(() => expand("hover"), ISLAND_TIMING.intent);
      }
    };
    const leave = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      window.clearTimeout(timers.current.intent);
      if (useIsland.getState().expanded && !keyboardFocusInside()) {
        timers.current.grace = window.setTimeout(() => collapse(), ISLAND_TIMING.grace);
      }
    };
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
    };
  }, [expand, collapse, keyboardFocusInside]);

  const onToggle = () => {
    if (!expanded) expand("click");
    // Opened by hovering: the click keeps it open, and the next click closes it.
    else if (openedBy.current === "hover") openedBy.current = "click";
    else collapse();
  };

  const onToggleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    if (!expanded && event.currentTarget.matches(":focus-visible")) expand("focus");
  };

  const onBlur = (event: FocusEvent) => {
    if (expanded && !nav.current?.contains(event.relatedTarget as Node | null)) collapse();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && expanded) {
      event.stopPropagation();
      collapse(true);
    }
  };

  const onSearch = () => {
    collapse();
    // Focus returns here when Search closes, not to a link that's about to hide.
    toggle.current?.focus();
    openSearch();
  };

  /** On the home page, a section link travels there smoothly and moves focus with it. */
  const onLink = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    collapse();
    if (pathname !== "/" || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    window.history.pushState(null, "", `#${id}`);
    const heading = target.querySelector<HTMLElement>("h1, h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  };

  // ─── Scroll progress ───────────────────────────────────────────────────────

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const range = root.scrollHeight - window.innerHeight;
      const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      ring.current?.style.setProperty("--island-progress", progress.toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  const ActivityIcon = activity?.icon;
  const announcement = activity ? [activity.title, activity.detail].filter(Boolean).join(". ") : "";

  return (
    <>
      {/* Phones dim the page behind the open sheet. A tap on it closes the sheet. */}
      <div className="island-scrim" data-open={expanded || undefined} aria-hidden="true" />
      <nav
        ref={nav}
        aria-label="Primary"
        data-tone="dark"
        data-view={view}
        className="island"
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onClick={(event) => {
          // The nav's padding stretches the 36px pill to a 44px target.
          if (event.target === event.currentTarget) toggle.current?.click();
        }}
      >
        <div className="island-shell" data-measured={size ? "" : undefined} style={shellStyle}>
          <span ref={bar} className="island-bar">
            <button
              ref={toggle}
              type="button"
              className="island-toggle"
              aria-expanded={expanded}
              aria-controls={menuId}
              onClick={onToggle}
              onFocus={onToggleFocus}
            >
              <span className="island-monogram" aria-hidden="true">
                {initials}
              </span>
              <span className="island-name">
                {leaving ? (
                  <span key={`out-${leaving}`} className="island-name-out" aria-hidden="true">
                    {leaving}
                  </span>
                ) : null}
                {shown ? (
                  <span key={`in-${shown}`} className="island-name-in" data-swap={leaving ? "" : undefined}>
                    {shown}
                  </span>
                ) : null}
              </span>
              <span className="sr-only">{shown ? ", sections" : "Sections"}</span>
              <svg ref={ring} className="island-ring" viewBox="0 0 14 14" aria-hidden="true">
                <circle className="island-ring-track" cx="7" cy="7" r="6" pathLength="1" />
                <circle className="island-ring-fill" cx="7" cy="7" r="6" pathLength="1" />
              </svg>
            </button>
          </span>

          <div ref={capsule} className="island-activity" aria-hidden="true" data-activity-tone={activity?.tone}>
            {activity ? (
              <span key={activity.key} className="island-activity-content">
                {ActivityIcon ? <ActivityIcon aria-hidden="true" className="island-activity-icon" /> : null}
                <span className="island-activity-title">{activity.title}</span>
                {activity.detail ? <span className="island-activity-detail">{activity.detail}</span> : null}
              </span>
            ) : null}
          </div>

          <div ref={panel} id={menuId} className="island-panel">
            <span className="island-spacer" aria-hidden="true">
              <span className="island-monogram">{initials}</span>
            </span>
            <button
              type="button"
              aria-label="Search"
              aria-keyshortcuts="Meta+K Control+K /"
              className="island-search island-scripted"
              onClick={onSearch}
            >
              <SearchIcon aria-hidden="true" />
              <span>Search</span>
              <kbd className="island-kbd">{hint}</kbd>
            </button>
            <span className="island-theme island-scripted">
              <ThemeToggle />
            </span>
            <Link href="/#contact" className="island-hello" onClick={onLink("contact")}>
              Say hello
            </Link>
            <ul className="island-links">
              {NAV.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/#${entry.id}`}
                    aria-current={current === entry.id ? "true" : undefined}
                    className={cx("island-link")}
                    onClick={onLink(entry.id)}
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </nav>
    </>
  );
}
