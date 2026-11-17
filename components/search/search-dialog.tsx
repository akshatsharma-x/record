"use client";

import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  Briefcase,
  Calculator,
  Check,
  FileText,
  GraduationCap,
  Hash,
  LayoutGrid,
  type LucideIcon,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cx } from "@/lib/cx";
import { island } from "@/lib/island/store";
import { durations } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { calculate, formatValue } from "@/lib/search/arithmetic";
import { loadSearchIndex } from "@/lib/search/load";
import { prepare } from "@/lib/search/match";
import { compose, groupOf, GROUPS, type Item } from "@/lib/search/results";
import { secretFor } from "@/lib/search/secrets";
import { closeSearch, useSearch } from "@/lib/search/store";
import type { SearchEntry, SearchPayload } from "@/lib/search/types";
import { SECTIONS } from "@/lib/sections";
import { isApplePlatform } from "@/lib/shortcuts";
import { sectionOf, travelTo } from "@/lib/travel";
import { type Action, buildActions, useActionState } from "./actions";
import { runSecret } from "./secrets";

const ICONS: Record<SearchEntry["kind"], LucideIcon> = {
  section: Hash,
  role: Briefcase,
  work: LayoutGrid,
  paper: FileText,
  skill: Sparkles,
  education: GraduationCap,
  honor: Award,
  certificate: BadgeCheck,
};

const NAV_IDS = new Set(SECTIONS.filter((section) => section.nav).map((section) => `section:${section.id}`));

type Result = (SearchEntry & Item & { action?: undefined }) | (Action & { action: true; suggested: boolean });

interface Calculated {
  id: "calculation";
  value: number;
  expression: string;
}

type Option = { result: Result } | { calculation: Calculated };

const optionId = (base: string, index: number) => `${base}-${index}`;

/**
 * Search (DESIGN.md §6.3): a centered glass panel in a top-layer <dialog>. A combobox
 * drives a grouped listbox through aria-activedescendant, so focus stays in the field
 * while ↑ and ↓ move the selection. Enter opens, ⌘Enter opens in a new tab, Esc closes,
 * and the dialog returns focus where it was. Results resolve in, 40ms apart, and the
 * highlight slides from row to row.
 */
export default function SearchDialog() {
  const open = useSearch((state) => state.open);
  const router = useRouter();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const actionState = useActionState();

  // ─── Data ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;
    loadSearchIndex()
      .then((next) => {
        if (alive) setPayload(next);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const entries = useMemo(
    () => (payload?.entries ?? []).map((entry) => prepare<Result>({ ...entry, suggested: NAV_IDS.has(entry.id) })),
    [payload],
  );

  const actions = useMemo(
    () =>
      buildActions(payload?.profile ?? null, actionState).map((action) =>
        prepare<Result>({ ...action, action: true, suggested: !action.quiet }),
      ),
    [payload, actionState],
  );

  const calculation = useMemo<Calculated | null>(() => {
    const result = calculate(query);
    return result ? { id: "calculation", ...result } : null;
  }, [query]);

  const composed = useMemo(() => compose<Result>([...entries, ...actions], query), [entries, actions, query]);

  // A secret command (DESIGN.md §8) shows only when it's typed exactly, as the Top hit.
  const secret = useMemo<Result | null>(() => {
    const command = payload ? secretFor(query, payload.secrets) : null;
    if (!command) return null;
    return {
      kind: "action",
      action: true,
      suggested: false,
      id: command.id,
      title: command.phrase,
      subtitle: command.label,
      keywords: [],
      body: "",
      icon: Sparkles,
      run: () => runSecret(command, payload?.profile.timeZone ?? "UTC", (href) => go(href, false)),
    };
    // go only reads the pathname and the router, which don't change while Search is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, payload]);

  const top: Option | null = secret ? { result: secret } : calculation ? { calculation } : composed.top ? { result: composed.top } : null;
  // Arithmetic takes the Top hit; what would have been leads its group instead.
  const displaced = calculation ? composed.top : null;
  const groups = displaced
    ? GROUPS.map((group) => {
        const existing = composed.groups.find((entry) => entry.id === group.id);
        const items = existing?.items ?? [];
        return { id: group.id, name: group.name, items: groupOf(displaced.kind) === group.id ? [displaced, ...items] : items };
      }).filter((group) => group.items.length > 0)
    : composed.groups;
  const options: Option[] = [...(top ? [top] : []), ...groups.flatMap((group) => group.items.map((result) => ({ result })))];
  const selected = Math.min(active, Math.max(0, options.length - 1));
  const count = options.length;

  // ─── Opening and closing ───────────────────────────────────────────────────

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.removeAttribute("data-closing");
      element.showModal();
      input.current?.select();
      return;
    }
    if (!open && element.open) {
      const finish = () => {
        element.removeAttribute("data-closing");
        element.close();
      };
      if (prefersReducedMotion() || element.hasAttribute("data-instant")) {
        element.removeAttribute("data-instant");
        finish();
        return;
      }
      element.setAttribute("data-closing", "");
      const timer = window.setTimeout(finish, durations.micro);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  /** Closes at once, so whatever runs next (a theme reveal, a print) sees the page. */
  const closeNow = () => {
    const element = dialog.current;
    if (element?.open) {
      element.removeAttribute("data-closing");
      element.close();
    }
    closeSearch();
  };

  // ─── Choosing ──────────────────────────────────────────────────────────────

  const go = (href: string, newTab: boolean) => {
    if (newTab || /^https?:/.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    const section = sectionOf(href, pathname);
    if (section && travelTo(section)) return;
    router.push(href);
  };

  const choose = (option: Option | undefined, newTab: boolean) => {
    if (!option) return;
    if ("calculation" in option) {
      const text = String(option.calculation.value);
      void navigator.clipboard
        .writeText(text)
        .then(() => island.show({ icon: Check, title: "Copied", detail: formatValue(option.calculation.value), tone: "success" }))
        .catch(() => undefined);
      closeNow();
      return;
    }
    const { result } = option;
    // Close first, at once: focus returns and a theme reveal sees the page, not the panel.
    // Then act inside the same gesture, which Safari needs for the clipboard.
    closeNow();
    if (result.action) {
      if (newTab && result.href) window.open(result.href, "_blank", "noopener,noreferrer");
      else result.run();
    } else {
      go(result.href, newTab);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (count === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((selected + step + count) % count);
      pointer.current = null;
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      choose(options[selected], event.metaKey || event.ctrlKey);
    }
  };

  // ─── The sliding highlight ─────────────────────────────────────────────────

  useEffect(() => {
    const row = list.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(listId, selected))}`);
    const marker = highlight.current;
    if (!marker) return;
    if (!row) {
      marker.style.opacity = "0";
      return;
    }
    marker.style.opacity = "1";
    marker.style.translate = `0 ${row.offsetTop}px`;
    marker.style.height = `${row.offsetHeight}px`;
    if (!pointer.current) row.scrollIntoView({ block: "nearest" });
  });

  // ─── The live count ────────────────────────────────────────────────────────

  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const message = !payload && !failed ? "" : count === 0 ? "No results" : count === 1 ? "1 result" : `${count} results`;
    const timer = window.setTimeout(() => setAnnounced(message), durations.uiLong);
    return () => window.clearTimeout(timer);
  }, [count, payload, failed]);

  // ─── Rendering ─────────────────────────────────────────────────────────────

  let index = 0;
  const row = (option: Option, big = false) => {
    const position = index++;
    const id = optionId(listId, position);
    const isSelected = position === selected;
    const common = {
      id,
      role: "option" as const,
      "aria-selected": isSelected,
      // Rows don't drift toward the pointer: the sliding highlight is their hover.
      "data-cursor": "default",
      "data-selected": isSelected || undefined,
      className: cx("search-option", big && "search-option-top"),
      style: { "--i": position } as CSSProperties,
      onPointerMove: (event: PointerEvent) => {
        const last = pointer.current;
        if (last && last.x === event.clientX && last.y === event.clientY) return;
        pointer.current = { x: event.clientX, y: event.clientY };
        if (position !== selected) setActive(position);
      },
      onClick: (event: MouseEvent) => choose(option, event.metaKey || event.ctrlKey),
    };
    if ("calculation" in option) {
      const value = formatValue(option.calculation.value);
      return (
        <div key="calculation" {...common}>
          <Calculator aria-hidden="true" className="search-option-icon" />
          <span className="search-option-text">
            <span className="search-option-title">
              = {value}
              <span className="sr-pause">,</span>
            </span>
            <span className="search-option-subtitle">{option.calculation.expression}</span>
          </span>
          <span className="search-option-meta" aria-hidden="true">
            Copy
          </span>
        </div>
      );
    }
    const { result } = option;
    const Icon = result.action ? result.icon : ICONS[result.kind as SearchEntry["kind"]];
    const external = result.action ? Boolean(result.href) : /^https?:/.test(result.href);
    // The name comes from what's shown, with commas a screen reader pauses on (WCAG 2.5.3).
    return (
      <div key={result.id} {...common}>
        <Icon aria-hidden="true" className="search-option-icon" />
        <span className="search-option-text">
          <span className="search-option-title">
            {result.title}
            {result.subtitle ? <span className="sr-pause">,</span> : null}
          </span>
          {result.subtitle ? (
            <span className="search-option-subtitle">
              {result.subtitle}
              {result.action && result.state ? <span className="sr-pause">,</span> : null}
            </span>
          ) : null}
        </span>
        <span className="search-option-meta">
          {result.action && result.state ? <span className="search-state">{result.state}</span> : null}
          {result.action && result.hint ? (
            <kbd className="search-kbd" aria-hidden="true">
              {result.hint}
            </kbd>
          ) : null}
          {external ? <ArrowUpRight aria-hidden="true" className="search-option-external" /> : null}
        </span>
      </div>
    );
  };

  const newTabHint = isApplePlatform() ? "⌘" : "Ctrl";

  return (
    <dialog
      ref={dialog}
      className="search"
      aria-label="Search"
      onCancel={(event) => {
        event.preventDefault();
        closeSearch();
      }}
      // The close event is queued: by the time it arrives, ⌘K may have reopened Search.
      onClose={(event) => {
        if (!event.currentTarget.open) closeSearch();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeSearch();
      }}
    >
      <div className="search-panel">
        <label className="search-field">
          <SearchIcon aria-hidden="true" className="search-field-icon" />
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-label="Search"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={count > 0 ? optionId(listId, selected) : undefined}
            placeholder="Search everything"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            className="search-input"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="search-kbd search-esc" aria-hidden="true">
            esc
          </kbd>
        </label>

        <div ref={list} id={listId} role="listbox" aria-label="Results" className="search-results">
          <div ref={highlight} className="search-highlight" aria-hidden="true" />
          {top ? (
            <div role="group" aria-labelledby={`${listId}-top`} className="search-group">
              <div id={`${listId}-top`} role="presentation" className="search-group-title">
                Top hit
              </div>
              {row(top, true)}
            </div>
          ) : null}
          {groups.map((group) => (
            <div key={group.id} role="group" aria-labelledby={`${listId}-${group.id}`} className="search-group">
              <div id={`${listId}-${group.id}`} role="presentation" className="search-group-title">
                {group.name}
              </div>
              {group.items.map((result) => row({ result }))}
            </div>
          ))}
          {count === 0 && query.trim() ? (
            <p className="search-empty">
              {failed ? "Search couldn't load. Check the connection and try again." : `No results for “${query.trim()}”.`}
            </p>
          ) : null}
        </div>

        <p className="search-footer" aria-hidden="true">
          <span>
            <kbd className="search-kbd">↑</kbd>
            <kbd className="search-kbd">↓</kbd> to move
          </span>
          <span>
            <kbd className="search-kbd">↵</kbd> to open
          </span>
          <span>
            <kbd className="search-kbd">{newTabHint} ↵</kbd> in a new tab
          </span>
          <span>
            <kbd className="search-kbd">esc</kbd> to close
          </span>
        </p>
        <p role="status" className="sr-only">
          {announced}
        </p>
      </div>
    </dialog>
  );
}
