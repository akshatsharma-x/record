/**
 * The close's behavior (DESIGN.md §7.9), loaded as #contact comes near (components/ui/
 * behavior.tsx). The server renders the dock as links and the thread's composer as a form;
 * this magnifies the dock, bounces what it launches and copies the email, and checks,
 * sends and threads the visitor's message. Each part returns what undoes it.
 */
import { Check, CircleAlert } from "lucide-react";
import { checkField, type ContactInput, type Field, type FieldCode, mailtoFor } from "./contact";
import { magnify } from "./dock";
import { island } from "./island/store";
import { springs, stepSpring, type SpringState } from "./motion";
import { prefersReducedMotion } from "./reduced-motion";
import { delivered } from "./surprises/delivered";
import { dockBounce } from "./surprises/dock-bounce";

// ─── The dock ────────────────────────────────────────────────────────────────

/**
 * The dock: macOS's magnification under a mouse (the icons spring toward lib/dock.ts's
 * scales and shifts, and the glass spreads with them), off with reduced motion and for
 * touch and the keyboard, which never need it. A click plays the launch bounce and lights
 * the dot under what it opened. Email copies the address, and the Island offers the mail
 * app. Escape hides a tooltip until the pointer or focus moves on (WCAG 1.4.13).
 */
export function attachDock(dock: HTMLElement): () => void {
  const row = dock.querySelector<HTMLElement>(".dock-items");
  const glass = dock.querySelector<HTMLElement>(".dock-glass");
  const items = Array.from(dock.querySelectorAll<HTMLAnchorElement>(".dock-item"));
  if (!row || !glass || items.length === 0) return () => undefined;
  const scale: SpringState[] = items.map(() => ({ value: 1, velocity: 0 }));
  const shift: SpringState[] = items.map(() => ({ value: 0, velocity: 0 }));
  // The glass's ends, in pixels from the row's resting left edge.
  let left: SpringState = { value: 0, velocity: 0 };
  let right: SpringState = { value: row.offsetWidth, velocity: 0 };
  let pointer: number | null = null;
  let frame = 0;
  let last = 0;

  const metrics = () => {
    const size = items[0].offsetWidth;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    return { size, gap, width: row.offsetWidth };
  };

  const paint = (width: number) => {
    items.forEach((item, i) => {
      const s = scale[i].value;
      const x = shift[i].value;
      if (Math.abs(s - 1) < 1e-3 && Math.abs(x) < 0.05) item.style.removeProperty("transform");
      else item.style.transform = `translateX(${x.toFixed(2)}px) scale(${s.toFixed(4)})`;
    });
    // The glass spreads with the row: its insets from the row's resting edges.
    glass.style.setProperty("--dock-left", `${left.value.toFixed(2)}px`);
    glass.style.setProperty("--dock-right", `${(width - right.value).toFixed(2)}px`);
  };

  const tick = (time: number) => {
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
    last = time;
    const { size, gap, width } = metrics();
    const target = magnify(items.length, size, gap, pointer);
    let moving = false;
    items.forEach((_, i) => {
      scale[i] = stepSpring(scale[i], target.scales[i], dt, springs.snappy);
      shift[i] = stepSpring(shift[i], target.shifts[i], dt, springs.snappy);
      if (Math.abs(scale[i].value - target.scales[i]) > 1e-3 || Math.abs(scale[i].velocity) > 1e-2) moving = true;
      if (Math.abs(shift[i].value - target.shifts[i]) > 0.05 || Math.abs(shift[i].velocity) > 0.5) moving = true;
    });
    left = stepSpring(left, target.left, dt, springs.snappy);
    right = stepSpring(right, target.right, dt, springs.snappy);
    if (Math.abs(left.value - target.left) > 0.05 || Math.abs(right.value - target.right) > 0.05) moving = true;
    paint(width);
    if (moving) frame = window.requestAnimationFrame(tick);
    else {
      frame = 0;
      last = 0;
    }
  };

  const run = () => {
    if (!frame) frame = window.requestAnimationFrame(tick);
  };

  // Magnification is for a mouse, and only with motion.
  const magnifies = (event: PointerEvent) => event.pointerType === "mouse" && !prefersReducedMotion();

  const onPointerMove = (event: PointerEvent) => {
    if (!magnifies(event)) return;
    pointer = event.clientX - row.getBoundingClientRect().left;
    dock.removeAttribute("data-quiet");
    run();
  };
  const onPointerLeave = () => {
    pointer = null;
    run();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || dock.hasAttribute("data-quiet")) return;
    // Handled here: nothing else should take this Escape too.
    event.preventDefault();
    dock.setAttribute("data-quiet", "");
  };
  const onFocusIn = () => dock.removeAttribute("data-quiet");

  // The launch bounce, then the dot under what it opened.
  const launch = (item: HTMLElement) => {
    if (!dockBounce.on) return;
    item.setAttribute("data-open", "");
    if (prefersReducedMotion()) return;
    item.removeAttribute("data-launch");
    // A reflow, so the bounce plays again on a second click.
    void item.offsetWidth;
    item.setAttribute("data-launch", "");
  };
  const onAnimationEnd = (event: AnimationEvent) => {
    (event.target as Element).closest(".dock-item")?.removeAttribute("data-launch");
  };

  const copyEmail = (item: HTMLAnchorElement) => {
    const email = item.dataset.email ?? "";
    const action = { label: dock.dataset.openMail ?? "", href: item.href };
    navigator.clipboard
      .writeText(email)
      .then(() => island.show({ icon: Check, title: dock.dataset.copied ?? "", detail: email, tone: "success", action }))
      .catch(() => island.show({ icon: CircleAlert, title: dock.dataset.notCopied ?? "", detail: email, tone: "error", action }));
  };

  const onClick = (event: MouseEvent) => {
    const item = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(".dock-item");
    if (!item) return;
    launch(item);
    if (item.dataset.app === "email") {
      // The address goes on the clipboard; the mail app is the Island's second offer.
      event.preventDefault();
      copyEmail(item);
    }
  };

  dock.setAttribute("data-magnify", "");
  dock.addEventListener("pointermove", onPointerMove);
  dock.addEventListener("pointerleave", onPointerLeave);
  dock.addEventListener("keydown", onKeyDown);
  dock.addEventListener("focusin", onFocusIn);
  dock.addEventListener("click", onClick);
  dock.addEventListener("animationend", onAnimationEnd);
  return () => {
    window.cancelAnimationFrame(frame);
    dock.removeAttribute("data-magnify");
    dock.removeEventListener("pointermove", onPointerMove);
    dock.removeEventListener("pointerleave", onPointerLeave);
    dock.removeEventListener("keydown", onKeyDown);
    dock.removeEventListener("focusin", onFocusIn);
    dock.removeEventListener("click", onClick);
    dock.removeEventListener("animationend", onAnimationEnd);
    for (const item of items) item.style.removeProperty("transform");
  };
}

// ─── The composer ────────────────────────────────────────────────────────────

type Errors = Record<
  | "nameRequired"
  | "nameLong"
  | "emailRequired"
  | "emailInvalid"
  | "emailLong"
  | "messageRequired"
  | "messageLong"
  | "rate"
  | "unavailable"
  | "failed",
  string
>;

/** Each field's codes, in content's words. */
const SAYS: Record<Field, Partial<Record<FieldCode, keyof Errors>>> = {
  name: { required: "nameRequired", long: "nameLong" },
  email: { required: "emailRequired", email: "emailInvalid", long: "emailLong" },
  message: { required: "messageRequired", long: "messageLong" },
};

const FIELDS: readonly Field[] = ["name", "email", "message"];

/** What the endpoint answers, as far as the page needs: a 400 names the fields. */
type Answer = { fields?: Partial<Record<Field, FieldCode>> } | null;

/** A spring token as Web Animations takes it: its linear() easing and how long it runs. */
function spring(name: "smooth" | "snappy") {
  const style = getComputedStyle(document.documentElement);
  return {
    easing: style.getPropertyValue(`--ease-spring-${name}`).trim() || "ease-out",
    duration: parseFloat(style.getPropertyValue(`--duration-spring-${name}`)) || 0,
  };
}

/**
 * The composer. Each field is checked as the visitor leaves it (and as they fix it), all
 * of them on send, with friendly words beside the field. Sent, the words swoosh up into
 * the thread as the visitor's bubble, "Delivered" appears under it and the Island says so.
 * If it can't send (the limit, no keys, a failure), the words stay and the visitor's mail
 * app is offered with them already written.
 */
export function attachComposer(form: HTMLFormElement): () => void {
  const list = form.closest(".thread")?.querySelector<HTMLOListElement>(".thread-messages");
  const send = form.querySelector<HTMLButtonElement>(".composer-send");
  const problem = form.querySelector<HTMLElement>(".composer-problem");
  const fallback = form.querySelector<HTMLAnchorElement>(".composer-fallback");
  const trap = form.querySelector<HTMLInputElement>(`input[name="website"]`);
  if (!list || !send || !problem || !fallback) return () => undefined;
  const errors = JSON.parse(form.dataset.errors ?? "{}") as Errors;
  const inputs = Object.fromEntries(FIELDS.map((field) => [field, form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement])) as Record<
    Field,
    HTMLInputElement | HTMLTextAreaElement
  >;
  const touched = new Set<Field>();
  let sending = false;

  const values = (): ContactInput => ({ name: inputs.name.value, email: inputs.email.value, message: inputs.message.value });

  const say = (field: Field, code: FieldCode | null) => {
    const input = inputs[field];
    const note = form.querySelector<HTMLElement>(`#composer-${field}-error`);
    const words = code ? errors[SAYS[field][code] ?? SAYS[field].required!] : "";
    if (code) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    if (!note) return;
    note.hidden = code === null;
    const text = note.querySelector("span");
    if (text) text.textContent = words;
  };

  const check = (field: Field) => {
    const code = checkField(field, inputs[field].value);
    say(field, code);
    return code;
  };

  const onBlur = (event: FocusEvent) => {
    const field = FIELDS.find((name) => inputs[name] === event.target);
    if (!field) return;
    // Only once the visitor has been there: an untouched field isn't wrong yet.
    if (inputs[field].value !== "" || touched.has(field)) {
      touched.add(field);
      check(field);
    }
  };
  const onInput = (event: Event) => {
    const field = FIELDS.find((name) => inputs[name] === event.target);
    // A field already marked wrong clears as soon as it's right.
    if (field && inputs[field].hasAttribute("aria-invalid")) check(field);
  };

  const trouble = (words: string | null) => {
    problem.hidden = words === null;
    const text = problem.querySelector("span");
    if (text) text.textContent = words ?? "";
    fallback.hidden = words === null;
    if (words !== null) fallback.href = mailtoFor(form.dataset.to ?? "", form.dataset.subject ?? "", values());
  };

  const busy = (on: boolean) => {
    sending = on;
    send.setAttribute("data-status", on ? "loading" : "idle");
    send.setAttribute("aria-label", (on ? send.dataset.sending : send.dataset.label) ?? "");
    if (on) send.setAttribute("aria-disabled", "true");
    else send.removeAttribute("aria-disabled");
    form.toggleAttribute("aria-busy", on);
  };

  /** The words swoosh up out of the composer into the thread as the visitor's bubble. */
  const thread = (message: string) => {
    const from = inputs.message.getBoundingClientRect();
    const bubble = document.createElement("li");
    bubble.className = "bubble";
    bubble.dataset.from = "you";
    const who = document.createElement("span");
    who.className = "sr-only";
    who.textContent = `${form.dataset.you ?? ""}: `;
    bubble.append(who, document.createTextNode(message));
    const receipt = document.createElement("li");
    receipt.className = "receipt";
    receipt.textContent = form.dataset.delivered ?? "";
    // "Delivered" is a surprise of its own, with its own flag.
    list.append(bubble, ...(delivered.on ? [receipt] : []));
    const to = bubble.getBoundingClientRect();
    if (prefersReducedMotion()) {
      bubble.animate([{ opacity: 0 }, { opacity: 1 }], { duration: spring("snappy").duration, easing: "ease-out" });
      receipt.setAttribute("data-shown", "");
      return;
    }
    const { easing, duration } = spring("smooth");
    const dx = from.right - to.right;
    const dy = from.top - to.top;
    const swoosh = bubble.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.96)`, opacity: 0.4 },
        { transform: "none", opacity: 1 },
      ],
      { duration, easing },
    );
    void swoosh.finished.then(() => receipt.setAttribute("data-shown", ""), () => receipt.setAttribute("data-shown", ""));
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (sending) return;
    const codes = FIELDS.map((field) => {
      touched.add(field);
      return [field, check(field)] as const;
    });
    const wrong = codes.find(([, code]) => code !== null);
    if (wrong) {
      inputs[wrong[0]].focus();
      return;
    }
    trouble(null);
    busy(true);
    const input = values();
    let status = 0;
    let body: Answer = null;
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, website: trap?.value ?? "" }),
      });
      status = response.status;
      body = (await response.json().catch(() => null)) as Answer;
    } catch {
      status = 0;
    }
    busy(false);
    if (status === 202) {
      thread(input.message.trim());
      inputs.message.value = "";
      touched.delete("message");
      island.show({ icon: Check, title: form.dataset.sent ?? "", tone: "success" });
      return;
    }
    if (status === 400 && body?.fields) {
      for (const field of FIELDS) say(field, body.fields[field] ?? null);
      const first = FIELDS.find((field) => body?.fields?.[field]);
      if (first) inputs[first].focus();
      return;
    }
    // The words stay; the mail app is offered with them.
    trouble(status === 429 ? errors.rate : status === 503 ? errors.unavailable : errors.failed);
  };

  form.addEventListener("focusout", onBlur);
  form.addEventListener("input", onInput);
  form.addEventListener("submit", onSubmit);
  form.setAttribute("data-ready", "");
  return () => {
    form.removeAttribute("data-ready");
    form.removeEventListener("focusout", onBlur);
    form.removeEventListener("input", onInput);
    form.removeEventListener("submit", onSubmit);
  };
}

/** The section's behavior: the dock and the composer. */
export function attachContact(root: HTMLElement): () => void {
  const undo = [
    ...Array.from(root.querySelectorAll<HTMLElement>(".dock"), attachDock),
    ...Array.from(root.querySelectorAll<HTMLFormElement>(".composer"), attachComposer),
  ];
  root.setAttribute("data-contact-ready", "");
  return () => {
    root.removeAttribute("data-contact-ready");
    for (const step of undo.reverse()) step();
  };
}
