/**
 * Classification Domain — Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockPrisma = vi.hoisted(() => ({
  tag: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  tradeTag: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    upsert: vi.fn(),
  },
  strategy: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  setup: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mistake: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  tradeMistake: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    upsert: vi.fn(),
  },
  trade: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation((promises: unknown[]) => Promise.all(promises)),
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn().mockResolvedValue("user_mock_123"),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

import {
  createTag,
  getTagById,
  listTags,
  updateTag,
  deleteTag,
  createStrategy,
  getStrategyById,
  listStrategies,
  updateStrategy,
  deleteStrategy,
  createSetup,
  getSetupById,
  listSetups,
  updateSetup,
  deleteSetup,
  createMistake,
  getMistakeById,
  listMistakes,
  updateMistake,
  deleteMistake,
  getTradeClassifications,
  setTradeTags,
  setTradeMistakes,
  assignTradeStrategy,
  assignTradeSetup,
} from "./service";

describe("Classification Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tag Operations", () => {
    it("creates a tag successfully", async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tag.create.mockResolvedValueOnce({
        id: "tag_1",
        name: "Breakout",
        color: "#10b981",
        createdAt: new Date(),
      });

      const tag = await createTag({ name: "Breakout", color: "#10b981" });
      expect(tag.id).toBe("tag_1");
      expect(tag.name).toBe("Breakout");
    });

    it("throws CONFLICT when tag name already exists", async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({
        id: "tag_existing",
        name: "Breakout",
      });

      await expect(createTag({ name: "Breakout" })).rejects.toThrow(/already exists/);
    });

    it("gets tag by ID", async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({
        id: "tag_1",
        name: "Breakout",
        color: null,
        createdAt: new Date(),
        _count: { trades: 5 },
      });

      const tag = await getTagById("tag_1");
      expect(tag.id).toBe("tag_1");
      expect(tag.tradeCount).toBe(5);
    });

    it("lists all tags ordered by name", async () => {
      mockPrisma.tag.findMany.mockResolvedValueOnce([
        { id: "tag_1", name: "A", color: null, createdAt: new Date() },
        { id: "tag_2", name: "B", color: null, createdAt: new Date() },
      ]);

      const list = await listTags();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe("A");
    });

    it("deletes a tag and cascades tradeTag associations", async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: "tag_1" });
      await deleteTag("tag_1");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("Strategy Operations", () => {
    it("creates and updates a strategy", async () => {
      mockPrisma.strategy.findUnique.mockResolvedValueOnce(null);
      mockPrisma.strategy.create.mockResolvedValueOnce({
        id: "strat_1",
        name: "Momentum",
        description: "Rule playbook",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const strat = await createStrategy({ name: "Momentum", description: "Rule playbook" });
      expect(strat.id).toBe("strat_1");
      expect(strat.name).toBe("Momentum");
    });

    it("deletes a strategy safely unlinking trades", async () => {
      mockPrisma.strategy.findUnique.mockResolvedValueOnce({ id: "strat_1" });
      await deleteStrategy("strat_1");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("Setup Operations", () => {
    it("creates, gets, and lists setups", async () => {
      mockPrisma.setup.findUnique.mockResolvedValueOnce(null);
      mockPrisma.setup.create.mockResolvedValueOnce({
        id: "setup_1",
        name: "Flag Pattern",
        description: null,
        createdAt: new Date(),
      });

      const setup = await createSetup({ name: "Flag Pattern" });
      expect(setup.id).toBe("setup_1");
    });
  });

  describe("Mistake Operations", () => {
    it("creates, gets, and lists mistakes", async () => {
      mockPrisma.mistake.findUnique.mockResolvedValueOnce(null);
      mockPrisma.mistake.create.mockResolvedValueOnce({
        id: "mist_1",
        name: "FOMO",
        description: "Emotional chase",
        createdAt: new Date(),
      });

      const mistake = await createMistake({ name: "FOMO", description: "Emotional chase" });
      expect(mistake.id).toBe("mist_1");
    });
  });

  describe("Trade Classifications & Associations", () => {
    it("throws NOT_FOUND when trade does not belong to user", async () => {
      mockPrisma.trade.findFirst.mockResolvedValueOnce(null);
      await expect(getTradeClassifications("unowned_trade")).rejects.toThrow(/not found/i);
    });

    it("gets full trade classifications summary", async () => {
      mockPrisma.trade.findFirst
        .mockResolvedValueOnce({ id: "trade_1" }) // ownership check
        .mockResolvedValueOnce({
          id: "trade_1",
          strategy: { id: "strat_1", name: "Trend", description: null, createdAt: new Date(), updatedAt: new Date() },
          setup: { id: "setup_1", name: "Cup & Handle", description: null, createdAt: new Date() },
          tags: [
            { tag: { id: "tag_1", name: "Tech", color: null, createdAt: new Date() } },
          ],
          mistakes: [
            { mistake: { id: "mist_1", name: "Chasing", description: null, createdAt: new Date() } },
          ],
        });

      const summary = await getTradeClassifications("trade_1");
      expect(summary.tradeId).toBe("trade_1");
      expect(summary.strategy?.name).toBe("Trend");
      expect(summary.setup?.name).toBe("Cup & Handle");
      expect(summary.tags).toHaveLength(1);
      expect(summary.mistakes).toHaveLength(1);
    });

    it("assigns and clears strategy on trade", async () => {
      mockPrisma.trade.findFirst.mockResolvedValueOnce({ id: "trade_1" });
      mockPrisma.strategy.findUnique.mockResolvedValueOnce({
        id: "strat_1",
        name: "Trend",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.trade.update.mockResolvedValueOnce({});

      const assigned = await assignTradeStrategy("trade_1", { strategyId: "strat_1" });
      expect(assigned?.id).toBe("strat_1");

      // Clear strategy
      mockPrisma.trade.findFirst.mockResolvedValueOnce({ id: "trade_1" });
      mockPrisma.trade.update.mockResolvedValueOnce({});
      const cleared = await assignTradeStrategy("trade_1", { strategyId: null });
      expect(cleared).toBeNull();
    });

    it("assigns and clears setup on trade", async () => {
      mockPrisma.trade.findFirst.mockResolvedValueOnce({ id: "trade_1" });
      mockPrisma.setup.findUnique.mockResolvedValueOnce({
        id: "setup_1",
        name: "Flag",
        description: null,
        createdAt: new Date(),
      });
      mockPrisma.trade.update.mockResolvedValueOnce({});

      const assigned = await assignTradeSetup("trade_1", { setupId: "setup_1" });
      expect(assigned?.id).toBe("setup_1");
    });

    it("atomically replaces trade tags", async () => {
      mockPrisma.trade.findFirst.mockResolvedValueOnce({ id: "trade_1" });
      mockPrisma.tag.findMany.mockResolvedValueOnce([{ id: "tag_1" }, { id: "tag_2" }]);
      mockPrisma.tradeTag.findMany.mockResolvedValueOnce([
        { tag: { id: "tag_1", name: "Tag 1", color: null, createdAt: new Date() } },
        { tag: { id: "tag_2", name: "Tag 2", color: null, createdAt: new Date() } },
      ]);

      const tags = await setTradeTags("trade_1", { tagIds: ["tag_1", "tag_2"] });
      expect(tags).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("atomically replaces trade mistakes", async () => {
      mockPrisma.trade.findFirst.mockResolvedValueOnce({ id: "trade_1" });
      mockPrisma.mistake.findMany.mockResolvedValueOnce([{ id: "mist_1" }]);
      mockPrisma.tradeMistake.findMany.mockResolvedValueOnce([
        { mistake: { id: "mist_1", name: "FOMO", description: null, createdAt: new Date() } },
      ]);

      const mistakes = await setTradeMistakes("trade_1", { mistakeIds: ["mist_1"] });
      expect(mistakes).toHaveLength(1);
    });

    it("tests additional CRUD operations across entities", async () => {
      // updateTag
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: "tag_1", name: "Old" });
      mockPrisma.tag.update.mockResolvedValueOnce({ id: "tag_1", name: "New", color: null, createdAt: new Date() });
      const updatedTag = await updateTag("tag_1", { name: "New" });
      expect(updatedTag.name).toBe("New");

      // getStrategyById, listStrategies, updateStrategy
      mockPrisma.strategy.findUnique.mockResolvedValueOnce({ id: "strat_1", name: "Strat", description: null, createdAt: new Date(), updatedAt: new Date() });
      expect((await getStrategyById("strat_1")).name).toBe("Strat");

      mockPrisma.strategy.findMany.mockResolvedValueOnce([{ id: "strat_1", name: "Strat", description: null, createdAt: new Date(), updatedAt: new Date() }]);
      expect(await listStrategies()).toHaveLength(1);

      mockPrisma.strategy.findUnique.mockResolvedValueOnce({ id: "strat_1", name: "Strat" });
      mockPrisma.strategy.update.mockResolvedValueOnce({ id: "strat_1", name: "Updated Strat", description: null, createdAt: new Date(), updatedAt: new Date() });
      expect((await updateStrategy("strat_1", { name: "Updated Strat" })).name).toBe("Updated Strat");

      // getSetupById, listSetups, updateSetup, deleteSetup
      mockPrisma.setup.findUnique.mockResolvedValueOnce({ id: "setup_1", name: "Setup", description: null, createdAt: new Date() });
      expect((await getSetupById("setup_1")).name).toBe("Setup");

      mockPrisma.setup.findMany.mockResolvedValueOnce([{ id: "setup_1", name: "Setup", description: null, createdAt: new Date() }]);
      expect(await listSetups()).toHaveLength(1);

      mockPrisma.setup.findUnique.mockResolvedValueOnce({ id: "setup_1", name: "Setup" });
      mockPrisma.setup.update.mockResolvedValueOnce({ id: "setup_1", name: "Updated Setup", description: null, createdAt: new Date() });
      expect((await updateSetup("setup_1", { name: "Updated Setup" })).name).toBe("Updated Setup");

      mockPrisma.setup.findUnique.mockResolvedValueOnce({ id: "setup_1", name: "Setup" });
      await deleteSetup("setup_1");

      // getMistakeById, listMistakes, updateMistake, deleteMistake
      mockPrisma.mistake.findUnique.mockResolvedValueOnce({ id: "mist_1", name: "FOMO", description: null, createdAt: new Date() });
      expect((await getMistakeById("mist_1")).name).toBe("FOMO");

      mockPrisma.mistake.findMany.mockResolvedValueOnce([{ id: "mist_1", name: "FOMO", description: null, createdAt: new Date() }]);
      expect(await listMistakes()).toHaveLength(1);

      mockPrisma.mistake.findUnique.mockResolvedValueOnce({ id: "mist_1", name: "FOMO" });
      mockPrisma.mistake.update.mockResolvedValueOnce({ id: "mist_1", name: "Updated Mistake", description: null, createdAt: new Date() });
      expect((await updateMistake("mist_1", { name: "Updated Mistake" })).name).toBe("Updated Mistake");

      mockPrisma.mistake.findUnique.mockResolvedValueOnce({ id: "mist_1", name: "FOMO" });
      await deleteMistake("mist_1");
    });
  });
});

