import { PrismaClient, TradeSide, TradeStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const TEST_USER_EMAIL = "playwright_test@example.com";
export const TEST_USER_PASSWORD = "Password123!";
export const TEST_USER_NAME = "Playwright Tester";

export async function seedTestData() {
  // 1. Ensure User exists
  let user = await prisma.user.findUnique({
    where: { email: TEST_USER_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: TEST_USER_EMAIL,
        name: TEST_USER_NAME,
        emailVerified: true,
      },
    });
  }

  // 2. Ensure Trading Account exists for this user
  let account = await prisma.tradingAccount.findFirst({
    where: { userId: user.id },
  });

  if (!account) {
    account = await prisma.tradingAccount.create({
      data: {
        userId: user.id,
        name: "Paper Alpha Account",
        type: "PAPER_TRADING",
        currency: "USD",
        initialBalance: 100000,
        currentBalance: 104500,
        isActive: true,
      },
    });
  }

  // 3. Ensure Strategy exists
  let strategy = await prisma.strategy.findFirst({
    where: { name: "Breakout Trend" },
  });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        name: "Breakout Trend",
        description: "High momentum breakout after consolidation",
      },
    });
  }

  // 4. Ensure Tag exists
  let tag = await prisma.tag.findFirst({
    where: { name: "Earnings Play" },
  });
  if (!tag) {
    tag = await prisma.tag.create({
      data: {
        name: "Earnings Play",
        color: "#10b981",
      },
    });
  }

  // 5. Ensure Mistake exists
  let mistake = await prisma.mistake.findFirst({
    where: { name: "FOMO Entry" },
  });
  if (!mistake) {
    mistake = await prisma.mistake.create({
      data: {
        name: "FOMO Entry",
        description: "Chased extended candle without waiting for support retest",
      },
    });
  }

  // 6. Ensure sample trades exist
  const existingTradesCount = await prisma.trade.count({
    where: { userId: user.id },
  });

  if (existingTradesCount === 0) {
    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Trade 1: AAPL Winner
    await prisma.trade.create({
      data: {
        userId: user.id,
        tradingAccountId: account.id,
        title: "AAPL Breakout Long",
        side: TradeSide.LONG,
        status: TradeStatus.CLOSED,
        entryPrice: 150.0,
        exitPrice: 155.0,
        quantity: 100,
        stopLoss: 148.0,
        takeProfit: 156.0,
        riskAmount: 200.0,
        plannedRiskReward: 3.0,
        actualRMultiple: 2.5,
        grossPnl: 500.0,
        commission: 2.0,
        fees: 1.0,
        netPnl: 497.0,
        entryDate: yesterday,
        exitDate: yesterday,
        strategyId: strategy.id,
        notes: "Clean 15m breakout with volume confirmation",
      },
    });

    // Trade 2: TSLA Loser
    await prisma.trade.create({
      data: {
        userId: user.id,
        tradingAccountId: account.id,
        title: "TSLA Short Pullback",
        side: TradeSide.SHORT,
        status: TradeStatus.CLOSED,
        entryPrice: 210.0,
        exitPrice: 215.0,
        quantity: 40,
        stopLoss: 215.0,
        takeProfit: 200.0,
        riskAmount: 200.0,
        plannedRiskReward: 2.0,
        actualRMultiple: -1.0,
        grossPnl: -200.0,
        commission: 2.0,
        fees: 1.0,
        netPnl: -203.0,
        entryDate: today,
        exitDate: today,
        notes: "Stopped out at daily high",
      },
    });

    // Trade 3: NVDA Open position
    await prisma.trade.create({
      data: {
        userId: user.id,
        tradingAccountId: account.id,
        title: "NVDA Momentum Long",
        side: TradeSide.LONG,
        status: TradeStatus.OPEN,
        entryPrice: 120.0,
        quantity: 50,
        stopLoss: 116.0,
        takeProfit: 128.0,
        riskAmount: 200.0,
        plannedRiskReward: 2.0,
        entryDate: today,
        notes: "Watching key moving averages",
      },
    });
  }

  // 7. Ensure a Journal Entry exists
  const existingJournal = await prisma.journalEntry.findFirst({
    where: { userId: user.id },
  });

  if (!existingJournal) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.journalEntry.create({
      data: {
        userId: user.id,
        entryDate: today,
        title: "Disciplined execution day",
        mood: "GOOD",
        energy: 8,
        focus: 9,
        notes: "Followed the morning routine, took 2 planned setups, respected risk management.",
      },
    });
  }

  return { user, account };
}

if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log("Database seeded successfully for test user.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
