// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlitchText } from "@/components/ui/glitch-text";

describe("GlitchText Component", () => {
  it("renders plain string text and sets data-text attribute", () => {
    render(<GlitchText>KAIVO</GlitchText>);
    const element = screen.getByText("KAIVO");
    expect(element).toBeDefined();
    expect(element.getAttribute("data-text")).toBe("KAIVO");
    expect(element.className).toContain("glitch-text");
  });

  it("supports structured children and explicit text prop", () => {
    render(
      <GlitchText text="KAIVO">
        <span>KAI</span>
        <span>VO</span>
      </GlitchText>
    );
    expect(screen.getByText("KAI")).toBeDefined();
    expect(screen.getByText("VO")).toBeDefined();
    const container = screen.getByText("KAI").parentElement;
    expect(container?.getAttribute("data-text")).toBe("KAIVO");
  });

  it("computes CSS custom properties for speed, offset, and shadows", () => {
    render(
      <GlitchText speed={0.8} offset={5} text="KAIVO">
        KAIVO
      </GlitchText>
    );
    const element = screen.getByText("KAIVO");
    const style = element.getAttribute("style");
    expect(style).toContain("--after-duration: 2.4s");
    expect(style).toContain("--before-duration: 1.6s");
    expect(style).toContain("--glitch-offset: 5px");
    expect(style).toContain("--after-shadow: -5px 0 #ef4444");
    expect(style).toContain("--before-shadow: 5px 0 #06b6d4");
  });

  it("supports rendering as a custom tag like h1", () => {
    render(
      <GlitchText as="h1" text="KAIVO">
        KAIVO
      </GlitchText>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.tagName.toLowerCase()).toBe("h1");
  });

  it("applies hover class when enableOnHover is true", () => {
    render(
      <GlitchText enableOnHover={true} text="KAIVO">
        KAIVO
      </GlitchText>
    );
    const element = screen.getByText("KAIVO");
    expect(element.className).toContain("glitch-hover");
  });
});
