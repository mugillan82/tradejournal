import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildAccountsQueryString,
  fetchTradingAccountsClient,
  getTradingAccountClient,
  createTradingAccountClient,
  updateTradingAccountClient,
  deleteTradingAccountClient,
  TradingAccountClientApiError,
} from "./accounts";

describe("Accounts Client Data Layer", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("buildAccountsQueryString", () => {
    it("serializes filters, sort, and pagination accurately", () => {
      const qs = buildAccountsQueryString({
        filters: {
          ids: ["acc-1", "acc-2"],
          isActive: true,
          currency: "USD",
          type: "LIVE",
          search: "Main Broker",
        },
        sort: {
          field: "name",
          direction: "asc",
        },
        pagination: {
          page: 2,
          pageSize: 25,
        },
      });

      const params = new URLSearchParams(qs);
      expect(params.get("ids")).toBe("acc-1,acc-2");
      expect(params.get("isActive")).toBe("true");
      expect(params.get("currency")).toBe("USD");
      expect(params.get("type")).toBe("LIVE");
      expect(params.get("search")).toBe("Main Broker");
      expect(params.get("sortField")).toBe("name");
      expect(params.get("sortDirection")).toBe("asc");
      expect(params.get("page")).toBe("2");
      expect(params.get("pageSize")).toBe("25");
    });

    it("returns empty string when no options provided", () => {
      expect(buildAccountsQueryString({})).toBe("");
    });
  });

  describe("fetchTradingAccountsClient", () => {
    it("fetches and parses accounts on 200 response", async () => {
      const mockResult = {
        items: [
          {
            id: "acc-1",
            userId: "u-1",
            name: "Main Live",
            type: "LIVE",
            currency: "USD",
            initialBalance: "10000.00",
            currentBalance: "12500.00",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      } as unknown as Response);

      const result = await fetchTradingAccountsClient();
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("Main Live");
    });

    it("throws TradingAccountClientApiError on server error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "VALIDATION",
            message: "Invalid filter",
            fieldErrors: [{ path: "currency", message: "Invalid currency" }],
          },
        }),
      } as unknown as Response);

      await expect(fetchTradingAccountsClient()).rejects.toThrow(
        TradingAccountClientApiError,
      );
    });
  });

  describe("getTradingAccountClient", () => {
    it("fetches single account by ID", async () => {
      const mockAccount = {
        id: "acc-1",
        name: "Paper Trading",
        type: "PAPER_TRADING",
        currency: "EUR",
        initialBalance: "50000.00",
        currentBalance: "51200.00",
        isActive: true,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAccount,
      } as unknown as Response);

      const result = await getTradingAccountClient("acc-1");
      expect(result.id).toBe("acc-1");
      expect(result.name).toBe("Paper Trading");
    });

    it("throws TradingAccountClientApiError on 404", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: { code: "NOT_FOUND", message: "TradingAccount not found" },
        }),
      } as unknown as Response);

      await expect(getTradingAccountClient("non-existent")).rejects.toThrow(
        TradingAccountClientApiError,
      );
    });
  });

  describe("createTradingAccountClient", () => {
    it("sends POST request and returns created account", async () => {
      const mockCreated = {
        id: "acc-new",
        name: "New Prop Account",
        type: "SIMULATION",
        currency: "USD",
        initialBalance: "100000.00",
        currentBalance: "100000.00",
        isActive: true,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockCreated,
      } as unknown as Response);

      const result = await createTradingAccountClient({
        name: "New Prop Account",
        type: "SIMULATION",
        currency: "USD",
        initialBalance: "100000.00",
      });

      expect(result.id).toBe("acc-new");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trading-accounts",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("updateTradingAccountClient", () => {
    it("sends PATCH request and returns updated account", async () => {
      const mockUpdated = {
        id: "acc-1",
        name: "Updated Name",
        type: "LIVE",
        currency: "USD",
        initialBalance: "10000.00",
        currentBalance: "15000.00",
        isActive: false,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUpdated,
      } as unknown as Response);

      const result = await updateTradingAccountClient("acc-1", {
        name: "Updated Name",
        isActive: false,
      });

      expect(result.name).toBe("Updated Name");
      expect(result.isActive).toBe(false);
    });
  });

  describe("deleteTradingAccountClient", () => {
    it("sends DELETE request successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      } as unknown as Response);

      await expect(deleteTradingAccountClient("acc-1")).resolves.toBeUndefined();
    });

    it("throws on delete failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "VALIDATION",
            message: "Cannot delete account with associated trades. Deactivate it instead.",
          },
        }),
      } as unknown as Response);

      await expect(deleteTradingAccountClient("acc-1")).rejects.toThrow(
        TradingAccountClientApiError,
      );
    });
  });
});
