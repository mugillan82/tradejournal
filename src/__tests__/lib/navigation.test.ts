import { describe, it, expect } from "vitest";
import { navigation, allNavHrefs, isKnownDestination } from "@/lib/navigation";

describe("Navigation Configuration Integrity", () => {
  it("ensures all navigation section labels are unique", () => {
    const sectionLabels = navigation.map((s) => s.label);
    const uniqueLabels = new Set(sectionLabels);
    expect(uniqueLabels.size).toBe(sectionLabels.length);
  });

  it("ensures every navigation item across all sections has a unique href (no duplicate keys)", () => {
    const allHrefs: string[] = [];
    for (const section of navigation) {
      for (const item of section.items) {
        allHrefs.push(item.href);
      }
    }

    const duplicateHrefs = allHrefs.filter(
      (href, index) => allHrefs.indexOf(href) !== index
    );

    expect(duplicateHrefs).toEqual([]);
    expect(new Set(allHrefs).size).toBe(allHrefs.length);
  });

  it("ensures all navigation items have valid canonical properties", () => {
    for (const section of navigation) {
      expect(section.items.length).toBeGreaterThan(0);
      for (const item of section.items) {
        expect(item.label.trim().length).toBeGreaterThan(0);
        expect(item.href.startsWith("/")).toBe(true);
        expect(item.icon).toBeDefined();
        expect(["ready", "coming-soon"]).toContain(item.status);
      }
    }
  });

  it("populates allNavHrefs and validates isKnownDestination correctly", () => {
    expect(allNavHrefs.has("/dashboard")).toBe(true);
    expect(allNavHrefs.has("/data-management")).toBe(true);
    expect(allNavHrefs.has("/import/smart")).toBe(true);

    expect(isKnownDestination("/dashboard")).toBe(true);
    expect(isKnownDestination("/trades/trade-123")).toBe(true);
    expect(isKnownDestination("/non-existent-random-page")).toBe(false);
  });
});
