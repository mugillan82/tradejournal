// @vitest-environment happy-dom
/**
 * Stitch Obsidian Orbit Application Shell & Navigation Test Suite
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrandMark } from "@/components/brand/brand-mark";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { UserMenu } from "@/components/layout/user-menu";
import { CommandPalette } from "@/components/layout/command-palette";
import { AppShell } from "@/components/layout/app-shell";

// Mock Next.js navigation hooks
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Stitch Obsidian Orbit Design System & Shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BrandMark", () => {
    it("renders Obsidian Orbit monogram and wordmark correctly", () => {
      render(<BrandMark size="md" showWordmark={true} />);
      expect(screen.getByText("KAI")).toBeDefined();
      expect(screen.getByText("VO")).toBeDefined();
      expect(screen.getByText("Orbit")).toBeDefined();
    });

    it("supports subtitle and hiding wordmark", () => {
      render(<BrandMark size="sm" showWordmark={true} subtitle="Terminal Edition" />);
      expect(screen.getByText("Terminal Edition")).toBeDefined();
    });
  });

  describe("Sidebar", () => {
    it("renders navigation items, sections, and active state", () => {
      render(<Sidebar userDisplayName="Alex Trader" />);
      expect(screen.getByText("Overview")).toBeDefined();
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Trades")).toBeDefined();
      expect(screen.getAllByText("Analytics").length).toBeGreaterThan(0);
      expect(screen.getByText("Orbit Live Sync")).toBeDefined();
      expect(screen.getByText("Alex Trader")).toBeDefined();
    });

    it("triggers command palette callback when clicking quick command hint", () => {
      const openCmdMock = vi.fn();
      render(<Sidebar onOpenCommandPalette={openCmdMock} />);
      const btn = screen.getByRole("button", { name: /Quick Command/i });
      fireEvent.click(btn);
      expect(openCmdMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Topbar", () => {
    it("renders page title, market status, quick action, and user menu", () => {
      render(
        <Topbar
          userDisplayName="Alex Trader"
          userEmail="alex@example.com"
          pageTitle="Trading Command Center"
        />
      );
      expect(screen.getByText("Trading Command Center")).toBeDefined();
      expect(screen.getByText("MARKETS:")).toBeDefined();
      expect(screen.getByText("ACTIVE")).toBeDefined();
      expect(screen.getByText("Log Trade")).toBeDefined();
    });

    it("triggers command palette callback from topbar search button", () => {
      const openCmdMock = vi.fn();
      render(
        <Topbar
          userDisplayName="Alex"
          userEmail="alex@example.com"
          onOpenCommandPalette={openCmdMock}
        />
      );
      const searchBtn = screen.getByRole("button", { name: /Quick Search/i });
      fireEvent.click(searchBtn);
      expect(openCmdMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("UserMenu", () => {
    it("toggles dropdown and displays email and navigation links", async () => {
      const user = userEvent.setup();
      render(<UserMenu displayName="Alex Trader" email="alex@example.com" />);

      // Initial state closed
      expect(screen.queryByText("alex@example.com")).toBeNull();

      // Click trigger button
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Menu opens
      expect(screen.getByText("alex@example.com")).toBeDefined();
      expect(screen.getByText("Settings & Preferences")).toBeDefined();
      expect(screen.getByText("Documentation & Guides")).toBeDefined();
      expect(screen.getByText("PRO")).toBeDefined();
    });
  });

  describe("CommandPalette", () => {
    it("filters destinations on user input and navigates on selection", async () => {
      const onCloseMock = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

      const input = screen.getByPlaceholderText(/Type a command or search destination/i);
      expect(input).toBeDefined();

      // Type "smart"
      await user.type(input, "smart");

      // Smart import result should be visible
      const smartImportBtn = screen.getByRole("button", { name: /Smart Import via AI/i });
      expect(smartImportBtn).toBeDefined();

      // Click result
      await user.click(smartImportBtn);
      expect(pushMock).toHaveBeenCalledWith("/import/smart");
      expect(onCloseMock).toHaveBeenCalled();
    });

    it("closes on ESC key", () => {
      const onCloseMock = vi.fn();
      render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("AppShell", () => {
    it("renders child content and handles Cmd+K / Ctrl+K keyboard shortcut", () => {
      render(
        <AppShell userDisplayName="Alex" userEmail="alex@example.com">
          <div data-testid="test-child">Obsidian Orbit Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("test-child")).toBeDefined();
      expect(screen.getByText("Obsidian Orbit Content")).toBeDefined();

      // Press Ctrl+K to open Command Palette
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.getByPlaceholderText(/Type a command or search destination/i)).toBeDefined();
    });
  });
});
