-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SIMULATION', 'PAPER_TRADING', 'LIVE', 'DEMO');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExecutionSide" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "JournalMood" AS ENUM ('VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "initialBalance" DECIMAL(18,2),
    "currentBalance" DECIMAL(18,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" "TradeSide" NOT NULL,
    "entryPrice" DECIMAL(18,8) NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitPrice" DECIMAL(18,8),
    "exitDate" TIMESTAMP(3),
    "stopLoss" DECIMAL(18,8),
    "takeProfit" DECIMAL(18,8),
    "riskAmount" DECIMAL(18,2),
    "plannedRiskReward" DECIMAL(10,2),
    "actualRMultiple" DECIMAL(10,2),
    "quantity" DECIMAL(18,8) NOT NULL,
    "grossPnl" DECIMAL(18,2),
    "commission" DECIMAL(18,2),
    "fees" DECIMAL(18,2),
    "swap" DECIMAL(18,2),
    "netPnl" DECIMAL(18,2),
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT,
    "notes" TEXT,
    "strategyId" TEXT,
    "setupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "side" "ExecutionSide" NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "commission" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeTag" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TradeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mistake" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeMistake" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "mistakeId" TEXT NOT NULL,

    CONSTRAINT "TradeMistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT,
    "journalEntryId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeNote" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "mood" "JournalMood",
    "energy" INTEGER,
    "focus" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTrade" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "notes" TEXT,
    "rating" INTEGER,

    CONSTRAINT "ReviewTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_isActive_userId_idx" ON "Account"("isActive", "userId");

-- CreateIndex
CREATE INDEX "Account_currency_idx" ON "Account"("currency");

-- CreateIndex
CREATE INDEX "Trade_userId_status_idx" ON "Trade"("userId", "status");

-- CreateIndex
CREATE INDEX "Trade_accountId_entryDate_idx" ON "Trade"("accountId", "entryDate");

-- CreateIndex
CREATE INDEX "Trade_entryDate_idx" ON "Trade"("entryDate");

-- CreateIndex
CREATE INDEX "Trade_side_status_idx" ON "Trade"("side", "status");

-- CreateIndex
CREATE INDEX "Trade_strategyId_idx" ON "Trade"("strategyId");

-- CreateIndex
CREATE INDEX "Trade_setupId_idx" ON "Trade"("setupId");

-- CreateIndex
CREATE INDEX "Trade_userId_entryDate_idx" ON "Trade"("userId", "entryDate");

-- CreateIndex
CREATE INDEX "Trade_userId_exitDate_idx" ON "Trade"("userId", "exitDate");

-- CreateIndex
CREATE INDEX "Trade_userId_side_status_idx" ON "Trade"("userId", "side", "status");

-- CreateIndex
CREATE INDEX "Trade_netPnl_idx" ON "Trade"("netPnl");

-- CreateIndex
CREATE INDEX "Execution_tradeId_datetime_idx" ON "Execution"("tradeId", "datetime");

-- CreateIndex
CREATE INDEX "Execution_datetime_idx" ON "Execution"("datetime");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "TradeTag_tagId_idx" ON "TradeTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeTag_tradeId_tagId_key" ON "TradeTag"("tradeId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_name_key" ON "Strategy"("name");

-- CreateIndex
CREATE INDEX "Strategy_name_idx" ON "Strategy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Setup_name_key" ON "Setup"("name");

-- CreateIndex
CREATE INDEX "Setup_name_idx" ON "Setup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Mistake_name_key" ON "Mistake"("name");

-- CreateIndex
CREATE INDEX "Mistake_name_idx" ON "Mistake"("name");

-- CreateIndex
CREATE INDEX "TradeMistake_mistakeId_idx" ON "TradeMistake"("mistakeId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeMistake_tradeId_mistakeId_key" ON "TradeMistake"("tradeId", "mistakeId");

-- CreateIndex
CREATE INDEX "Attachment_tradeId_idx" ON "Attachment"("tradeId");

-- CreateIndex
CREATE INDEX "Attachment_journalEntryId_idx" ON "Attachment"("journalEntryId");

-- CreateIndex
CREATE INDEX "TradeNote_tradeId_idx" ON "TradeNote"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryDate_key" ON "JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_idx" ON "JournalEntry"("userId");

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_reviewDate_idx" ON "Review"("reviewDate");

-- CreateIndex
CREATE INDEX "Review_userId_reviewDate_idx" ON "Review"("userId", "reviewDate");

-- CreateIndex
CREATE INDEX "ReviewTrade_tradeId_idx" ON "ReviewTrade"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTrade_reviewId_tradeId_key" ON "ReviewTrade"("reviewId", "tradeId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "Setup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeTag" ADD CONSTRAINT "TradeTag_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeTag" ADD CONSTRAINT "TradeTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeMistake" ADD CONSTRAINT "TradeMistake_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeMistake" ADD CONSTRAINT "TradeMistake_mistakeId_fkey" FOREIGN KEY ("mistakeId") REFERENCES "Mistake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeNote" ADD CONSTRAINT "TradeNote_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTrade" ADD CONSTRAINT "ReviewTrade_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTrade" ADD CONSTRAINT "ReviewTrade_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
