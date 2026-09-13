/**
 * Import Domain — Mapping
 *
 * Defines canonical field names and column aliases for mapping raw data
 * (like CSV columns) to the internal domain models.
 */

export type CanonicalField =
  | "tradingAccountId"
  | "externalReference"
  | "symbol" // Maps to 'title' in Trade model usually
  | "side"
  | "status"
  | "entryDate"
  | "exitDate"
  | "entryPrice"
  | "exitPrice"
  | "quantity"
  | "stopLoss"
  | "takeProfit"
  | "riskAmount"
  | "grossPnl"
  | "netPnl"
  | "commission"
  | "fees"
  | "swap"
  | "notes"
  | "tags";

// Maps known common column names to our CanonicalField
// Keys should be lowercase, stripped of non-alphanumeric characters for matching.
export const COMMON_ALIASES: Record<string, CanonicalField> = {
  // Symbol / Title
  symbol: "symbol",
  ticker: "symbol",
  instrument: "symbol",
  asset: "symbol",
  product: "symbol",
  item: "symbol",

  // Side
  side: "side",
  action: "side",
  direction: "side",
  type: "side", // sometimes used for buy/sell

  // Status
  status: "status",
  state: "status",

  // Dates
  time: "entryDate", // generic time often means entry
  date: "entryDate",
  entrytime: "entryDate",
  entrydate: "entryDate",
  opentime: "entryDate",
  opendate: "entryDate",
  
  exittime: "exitDate",
  exitdate: "exitDate",
  closetime: "exitDate",
  closedate: "exitDate",

  // Prices
  price: "entryPrice",
  entryprice: "entryPrice",
  openprice: "entryPrice",
  avgprice: "entryPrice",

  exitprice: "exitPrice",
  closeprice: "exitPrice",

  // Quantity
  size: "quantity",
  qty: "quantity",
  quantity: "quantity",
  volume: "quantity",
  amount: "quantity",
  contracts: "quantity",
  shares: "quantity",

  // Risk
  stoploss: "stopLoss",
  sl: "stopLoss",
  takeprofit: "takeProfit",
  tp: "takeProfit",
  risk: "riskAmount",
  riskamount: "riskAmount",

  // P&L
  pnl: "netPnl", // usually pnl means net unless gross is specified
  netpnl: "netPnl",
  netprofit: "netPnl",
  net: "netPnl",
  profit: "netPnl",
  profitloss: "netPnl",

  grosspnl: "grossPnl",
  grossprofit: "grossPnl",
  gross: "grossPnl",

  // Costs
  commission: "commission",
  comm: "commission",
  commissions: "commission",
  fee: "fees",
  fees: "fees",
  swap: "swap",
  interest: "swap",
  rollover: "swap",

  // Meta
  notes: "notes",
  comment: "notes",
  comments: "notes",
  tags: "tags",
  labels: "tags",
  ticket: "externalReference",
  order: "externalReference",
  orderid: "externalReference",
  tradeid: "externalReference",
  ref: "externalReference",
};

export function normalizeColumnName(rawName: string): string {
  return rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function suggestCanonicalMapping(rawName: string): CanonicalField | null {
  const normalized = normalizeColumnName(rawName);
  return COMMON_ALIASES[normalized] || null;
}

/**
 * Mapping definition provided by the user or auto-detected.
 */
export interface ColumnMapping {
  // The key is the exact column name from the source (e.g. "Buy/Sell")
  // The value is the canonical field it maps to, or null if ignored
  [sourceColumn: string]: CanonicalField | null;
}
