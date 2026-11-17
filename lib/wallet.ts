/**
 * The wallet's stack (DESIGN.md §7.8): which pass sits where, and where the keys go.
 * Pure, so tests pin it; lib/credentials-behavior.ts applies it.
 */

/**
 * Each pass's place in the stack, top to bottom: the pass in front is 0, and the rest
 * follow it in content's order, so bringing one forward slides the others down beneath it.
 */
export function slots(count: number, front: number): number[] {
  return Array.from({ length: count }, (_, i) => (i === front ? 0 : i < front ? i + 1 : i));
}

/** The pass at each place: the inverse of `slots`. */
export function byPlace(count: number, front: number): number[] {
  const order = new Array<number>(count);
  slots(count, front).forEach((place, i) => {
    order[place] = i;
  });
  return order;
}

/**
 * Where an arrow key, Home or End moves focus from pass `index`, in the order the passes
 * are seen (the front pass, then the stack beneath it), or null for any other key. It
 * stops at the ends rather than wrapping, as a list does.
 */
export function moveFocus(key: string, index: number, count: number, front: number): number | null {
  const order = byPlace(count, front);
  const place = order.indexOf(index);
  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return order[Math.min(count - 1, place + 1)];
    case "ArrowUp":
    case "ArrowLeft":
      return order[Math.max(0, place - 1)];
    case "Home":
      return order[0];
    case "End":
      return order[count - 1];
    default:
      return null;
  }
}

/** True once an expiry month (YYYY-MM) has passed in the visitor's calendar: "Expired". */
export function hasExpired(expires: string, today: Date): boolean {
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return expires < month;
}
