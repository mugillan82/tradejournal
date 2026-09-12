// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildExportQueryString,
  fetchDataManagementOverview,
  requestExportDownload,
  triggerBrowserDownload,
  DataManagementClientApiError,
} from "./data-management";

describe("Data Management Client Data Layer", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("buildExportQueryString", () => {
    it("serializes query parameters properly", () => {
      const qs = buildExportQueryString({
        dataset: "trades",
        format: "csv",
        accountId: "acc-1",
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z",
      });

      expect(qs).toContain("dataset=trades");
      expect(qs).toContain("format=csv");
      expect(qs).toContain("accountId=acc-1");
      expect(qs).toContain("from=2026-01-01T00%3A00%3A00.000Z");
      expect(qs).toContain("to=2026-01-31T23%3A59%3A59.999Z");
    });
  });

  describe("fetchDataManagementOverview", () => {
    it("returns overview data on successful response", async () => {
      const mockOverview = {
        accounts: 2,
        trades: 10,
        executions: 20,
        journalEntries: 5,
        tradeNotes: 3,
        reviews: 1,
        tags: 4,
        strategies: 2,
        setups: 3,
        mistakes: 1,
        attachments: 2,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockOverview }),
      });

      const data = await fetchDataManagementOverview();
      expect(data).toEqual(mockOverview);
    });

    it("throws structured DataManagementClientApiError on failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Unauthorized", code: "AUTH_REQUIRED" } }),
      });

      await expect(fetchDataManagementOverview()).rejects.toThrow(DataManagementClientApiError);
    });
  });

  describe("requestExportDownload", () => {
    it("requests export and extracts headers and data", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          "Content-Disposition": 'attachment; filename="trades-export.csv"',
          "Content-Type": "text/csv; charset=utf-8",
          "X-Export-Records": "5",
        }),
        text: async () => "Trade ID,Account\r\n1,Apex",
      });

      const result = await requestExportDownload({ dataset: "trades", format: "csv" });

      expect(result.filename).toBe("trades-export.csv");
      expect(result.recordCount).toBe(5);
      expect(result.mimeType).toBe("text/csv; charset=utf-8");
      expect(result.data).toBe("Trade ID,Account\r\n1,Apex");
    });

    it("throws DataManagementClientApiError when export fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Invalid parameters", code: "INVALID_EXPORT_PARAMETERS" },
        }),
      });

      await expect(requestExportDownload({ dataset: "trades", format: "csv" })).rejects.toThrow(
        DataManagementClientApiError
      );
    });
  });

  describe("triggerBrowserDownload", () => {
    it("creates an object url and triggers click", () => {
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/123");
      window.URL.revokeObjectURL = vi.fn();

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      triggerBrowserDownload("sample data", "test.csv", "text/csv");

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/123");

      clickSpy.mockRestore();
    });
  });
});
