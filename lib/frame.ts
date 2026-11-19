/**
 * One animation frame for the page's scroll-driven work (DESIGN.md §10, Part 16): every read
 * first, then every write. A style written and then a layout read makes the browser lay the
 * page out again mid-frame, and with a dozen scenes reading and writing in turn a scroll cost
 * long tasks; with every read done first, nothing forces a layout.
 *
 * Scroll events fire before a frame's animation callbacks, in the same frame, so work moved
 * here from a scroll handler lands in the frame it always did. A job asked for twice in one
 * frame runs once. A write asked for by a read runs in that frame; anything asked for while
 * the writes run waits for the next.
 */

type Job = () => void;

let reads = new Set<Job>();
let writes = new Set<Job>();
let frame = 0;
let phase: "idle" | "reading" | "writing" = "idle";

function run(jobs: Set<Job>) {
  for (const job of jobs) {
    try {
      job();
    } catch (error) {
      // One scene's failure mustn't stop the rest of the frame; it still reaches the console.
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}

function flush() {
  frame = 0;
  phase = "reading";
  const reading = reads;
  reads = new Set();
  run(reading);
  phase = "writing";
  const writing = writes;
  writes = new Set();
  run(writing);
  phase = "idle";
}

function request() {
  if (!frame) frame = requestAnimationFrame(flush);
}

/** Reads layout (or the scroll position) in this frame's read phase, or the next frame's. */
export function measure(job: Job): void {
  reads.add(job);
  request();
}

/** Writes styles in this frame's write phase, after every read. */
export function mutate(job: Job): void {
  writes.add(job);
  // Asked for by a read, it runs in this frame's writes, which haven't started.
  if (phase !== "reading") request();
}
