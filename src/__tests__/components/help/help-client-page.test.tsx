// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HelpClientPage } from "@/components/help/help-client-page";

describe("HelpClientPage Component", () => {
  it("renders help hub title and search input", () => {
    render(<HelpClientPage />);

    expect(
      screen.getByText("Product Documentation & User Guide"),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText(/Search topics/i),
    ).toBeDefined();
  });

  it("renders key product documentation topics", () => {
    render(<HelpClientPage />);

    expect(screen.getByText("Dashboard & Trading Command Center")).toBeDefined();
    expect(screen.getByText("Trade Logging & Execution Management")).toBeDefined();
    expect(screen.getByText("Structured File Import (CSV & Excel XLSX)")).toBeDefined();
    expect(screen.getByText("Smart Screenshot Vision Import")).toBeDefined();
    expect(screen.getByText("Analytics Engine & Performance Metrics")).toBeDefined();
    expect(screen.getByText("Interactive Calendar & Daily Journal")).toBeDefined();
    expect(screen.getByText("Structured Trade Reviews & Retrospectives")).toBeDefined();
    expect(screen.getByText("Trading Accounts & Portfolios")).toBeDefined();
    expect(screen.getByText("Data Management & Backups")).toBeDefined();
    expect(screen.getByText("Product Settings & Customization")).toBeDefined();
  });

  it("filters topics when a category pill is clicked", () => {
    render(<HelpClientPage />);

    // Click Import category
    const importBtn = screen.getByRole("button", { name: "Import" });
    fireEvent.click(importBtn);

    expect(screen.getByText("Structured File Import (CSV & Excel XLSX)")).toBeDefined();
    expect(screen.getByText("Smart Screenshot Vision Import")).toBeDefined();
    expect(screen.queryByText("Dashboard & Trading Command Center")).toBeNull();
  });

  it("filters topics based on search query", () => {
    render(<HelpClientPage />);

    const searchInput = screen.getByPlaceholderText(/Search topics/i);
    fireEvent.change(searchInput, { target: { value: "profit factor" } });

    expect(screen.getByText("Analytics Engine & Performance Metrics")).toBeDefined();
    expect(screen.queryByText("Trading Accounts & Portfolios")).toBeNull();
  });

  it("displays empty state when no topics match search", () => {
    render(<HelpClientPage />);

    const searchInput = screen.getByPlaceholderText(/Search topics/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent-topic-xyz" } });

    expect(
      screen.getByText(/No documentation topics match/i),
    ).toBeDefined();
  });
});
