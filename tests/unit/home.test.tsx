// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import Home from "@/app/page";

afterEach(cleanup);

it("renders a plain page title and nothing else yet", () => {
  const { container } = render(<Home />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Akshat Sharma");
  expect(container.textContent).toBe("Akshat Sharma");
});
