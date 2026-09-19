// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DuplicateResolutionModal } from "@/components/imports/duplicate-resolution-modal";
import type { NormalizedTradeCandidate } from "@/lib/trading/import/types";

const mockCandidates: NormalizedTradeCandidate[] = [
  // 2 new trades
  {
    candidateId: "cand-1",
    tradingAccountId: "acc-1",
    title: "NAS100",
    side: "LONG",
    status: "CLOSED",
    quantity: "0.10",
    entryPrice: "18500.00",
    exitPrice: "18550.00",
    grossPnl: "50.00",
    netPnl: "50.00",
    entryDate: new Date("2026-09-19T10:00:00Z"),
    exitDate: new Date("2026-09-19T11:00:00Z"),
    isValid: true,
    validationIssues: [],
    duplicateMatch: { classification: "NONE", reasons: [] },
  },
  {
    candidateId: "cand-2",
    tradingAccountId: "acc-1",
    title: "US30",
    side: "SHORT",
    status: "CLOSED",
    quantity: "0.05",
    entryPrice: "39000.00",
    exitPrice: "38900.00",
    grossPnl: "100.00",
    netPnl: "100.00",
    entryDate: new Date("2026-09-19T11:30:00Z"),
    exitDate: new Date("2026-09-19T12:00:00Z"),
    isValid: true,
    validationIssues: [],
    duplicateMatch: { classification: "NONE", reasons: [] },
  },
  // 3 duplicate trades (from yesterday)
  {
    candidateId: "cand-3",
    tradingAccountId: "acc-1",
    title: "XAUUSD",
    side: "LONG",
    status: "CLOSED",
    quantity: "0.20",
    entryPrice: "2350.00",
    exitPrice: "2360.00",
    grossPnl: "200.00",
    netPnl: "200.00",
    entryDate: new Date("2026-09-18T14:00:00Z"),
    exitDate: new Date("2026-09-18T15:00:00Z"),
    isValid: true,
    validationIssues: [],
    duplicateMatch: { classification: "EXACT", reasons: ["Matches existing trade #trade-123"] },
  },
  {
    candidateId: "cand-4",
    tradingAccountId: "acc-1",
    title: "EURUSD",
    side: "SHORT",
    status: "CLOSED",
    quantity: "1.00",
    entryPrice: "1.0850",
    exitPrice: "1.0820",
    grossPnl: "300.00",
    netPnl: "300.00",
    entryDate: new Date("2026-09-18T16:00:00Z"),
    exitDate: new Date("2026-09-18T17:00:00Z"),
    isValid: true,
    validationIssues: [],
    duplicateMatch: { classification: "EXACT", reasons: ["Matches existing trade #trade-124"] },
  },
  {
    candidateId: "cand-5",
    tradingAccountId: "acc-1",
    title: "GBPUSD",
    side: "LONG",
    status: "CLOSED",
    quantity: "0.50",
    entryPrice: "1.2700",
    exitPrice: "1.2680",
    grossPnl: "-100.00",
    netPnl: "-100.00",
    entryDate: new Date("2026-09-18T18:00:00Z"),
    exitDate: new Date("2026-09-18T19:00:00Z"),
    isValid: true,
    validationIssues: [],
    duplicateMatch: { classification: "POSSIBLE", reasons: ["Possible duplicate trade"] },
  },
];

describe("DuplicateResolutionModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DuplicateResolutionModal
        isOpen={false}
        onClose={vi.fn()}
        candidates={mockCandidates}
        onConfirmOnlyNew={vi.fn()}
        onConfirmAll={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with 2 new trades and 3 already added trades", () => {
    render(
      <DuplicateResolutionModal
        isOpen={true}
        onClose={vi.fn()}
        candidates={mockCandidates}
        onConfirmOnlyNew={vi.fn()}
        onConfirmAll={vi.fn()}
      />
    );

    expect(screen.getByText("Duplicate Trades Detected")).toBeTruthy();
    expect(screen.getByText("New Trades")).toBeTruthy();
    expect(screen.getByText("Already in Journal")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy(); // 2 new
    expect(screen.getByText("3")).toBeTruthy(); // 3 duplicate
  });

  it("filters out duplicates and sends ONLY new trades when clicking 'Add Only New Trades'", () => {
    const handleConfirmOnlyNew = vi.fn();
    const handleConfirmAll = vi.fn();

    render(
      <DuplicateResolutionModal
        isOpen={true}
        onClose={vi.fn()}
        candidates={mockCandidates}
        onConfirmOnlyNew={handleConfirmOnlyNew}
        onConfirmAll={handleConfirmAll}
      />
    );

    const onlyNewBtn = screen.getByRole("button", { name: /add only new trades/i });
    fireEvent.click(onlyNewBtn);

    expect(handleConfirmOnlyNew).toHaveBeenCalledTimes(1);
    const passedCandidates = handleConfirmOnlyNew.mock.calls[0][0];
    expect(passedCandidates).toHaveLength(2);
    expect(passedCandidates.map((c: NormalizedTradeCandidate) => c.title)).toEqual(["NAS100", "US30"]);
    expect(handleConfirmAll).not.toHaveBeenCalled();
  });

  it("sends all trades including duplicates when clicking 'Add Already Added Trades Too'", () => {
    const handleConfirmOnlyNew = vi.fn();
    const handleConfirmAll = vi.fn();

    render(
      <DuplicateResolutionModal
        isOpen={true}
        onClose={vi.fn()}
        candidates={mockCandidates}
        onConfirmOnlyNew={handleConfirmOnlyNew}
        onConfirmAll={handleConfirmAll}
      />
    );

    const allBtn = screen.getByRole("button", { name: /add already added trades too/i });
    fireEvent.click(allBtn);

    expect(handleConfirmAll).toHaveBeenCalledTimes(1);
    const passedCandidates = handleConfirmAll.mock.calls[0][0];
    expect(passedCandidates).toHaveLength(5);
    expect(handleConfirmOnlyNew).not.toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();

    render(
      <DuplicateResolutionModal
        isOpen={true}
        onClose={handleClose}
        candidates={mockCandidates}
        onConfirmOnlyNew={vi.fn()}
        onConfirmAll={vi.fn()}
      />
    );

    const closeBtn = screen.getByLabelText("Close dialog");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
