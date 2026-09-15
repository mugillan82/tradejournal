// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Input Component — Deterministic Hydration & ID Management", () => {
  it("generates deterministic React useId for input and associates label htmlFor", () => {
    const { container } = render(<Input label="Screenshot Upload" />);

    const input = container.querySelector("input")!;
    const label = container.querySelector("label")!;

    expect(input).toBeTruthy();
    expect(label).toBeTruthy();
    expect(input.id).toBeTruthy();
    expect(label.getAttribute("for")).toBe(input.id);
    // Should NOT contain random string pattern (Math.random)
    expect(input.id).not.toMatch(/input-[a-z0-9]{7}/);
  });

  it("preserves externally supplied id and associates label htmlFor", () => {
    const customId = "custom-screenshot-file-id";
    const { container } = render(<Input id={customId} label="Custom Input" />);

    const input = container.querySelector("input")!;
    const label = container.querySelector("label")!;

    expect(input.id).toBe(customId);
    expect(label.getAttribute("for")).toBe(customId);
  });

  it("correctly generates hint and error ids based on input id", () => {
    const customId = "trade-quantity";
    render(
      <Input
        id={customId}
        label="Quantity"
        hint="Enter lots"
        error="Invalid lot size"
      />
    );

    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBe(`${customId}-error ${customId}-hint`);

    const errorElement = screen.getByRole("alert");
    expect(errorElement.id).toBe(`${customId}-error`);
    expect(errorElement.textContent).toBe("Invalid lot size");
  });

  it("links hintId via aria-describedby when error is not present", () => {
    const customId = "trade-symbol";
    render(<Input id={customId} label="Symbol" hint="e.g. EURUSD" />);

    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toBe(`${customId}-hint`);
    expect(screen.getByText("e.g. EURUSD").id).toBe(`${customId}-hint`);
  });

  it("forwards ref to the underlying HTMLInputElement", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} id="ref-test" defaultValue="test value" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.value).toBe("test value");
  });
});
