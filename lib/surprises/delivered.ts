import { define } from "./define.ts";

/** A sent message says Delivered under it. Built in Part 12. */
export const delivered = define({ id: "delivered", section: "contact", on: true });
