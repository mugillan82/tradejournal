import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
import { GET } from "./route";
import * as authSession from "@/lib/auth/session";
import * as calendarService from "@/lib/trading/calendar/service";
import type { MonthCalendarDto } from "@/lib/trading/calendar/types";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/calendar/service", () => ({
  getMonthCalendar: vi.fn(),
}));

describe("GET /api/calendar/month", () => {
  const mockUserId = "usr-test-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 AUTH_REQUIRED when user is not authenticated", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest("http://localhost:3000/api/calendar/month?month=2026-09");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 200 with month calendar DTO when authenticated", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
    const mockData = {
      month: "2026-09",
      summary: {
        month: "2026-09",
        totalTrades: 5,
        closedTrades: 5,
        openTrades: 0,
        winningTrades: 4,
        losingTrades: 1,
        breakevenTrades: 0,
        netPnl: "1250.00",
        grossProfit: "1500.00",
        grossLoss: "250.00",
        winRate: 80,
        profitFactor: "6.00",
        winningDays: 3,
        losingDays: 1,
        breakevenDays: 0,
        bestDay: { date: "2026-09-02", netPnl: "800.00" },
        worstDay: { date: "2026-09-10", netPnl: "-250.00" },
        averageDailyPnl: "312.50",
        totalRisk: "500.00",
        averageR: "2.10",
      },
      days: {
        "2026-09-02": {
          date: "2026-09-02",
          tradeCount: 2,
          winCount: 2,
          lossCount: 0,
          breakevenCount: 0,
          openCount: 0,
          netPnl: "800.00",
          winRate: 100,
          totalR: "3.20",
          hasJournalEntry: true,
          journalEntryId: "j-1",
          journalMood: "VERY_GOOD",
          journalNotes: "Strong discipline",
          trades: [],
        },
      },
    };

    vi.mocked(calendarService.getMonthCalendar).mockResolvedValue(mockData as unknown as MonthCalendarDto);

    const request = new NextRequest(
      "http://localhost:3000/api/calendar/month?month=2026-09&symbol=AAPL&side=LONG",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.month).toBe("2026-09");
    expect(body.summary.netPnl).toBe("1250.00");
    expect(calendarService.getMonthCalendar).toHaveBeenCalledWith(
      "2026-09",
      expect.objectContaining({
        symbol: "AAPL",
        side: "LONG",
      }),
    );
  });
});
