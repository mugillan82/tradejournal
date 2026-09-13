/**
 * Import Domain — Mapping
 *
 * Defines canonical field names, aliases, and detection helpers for mapping
 * raw source columns (CSV/XLSX) to internal domain models.
 */

export type CanonicalField =
  | "tradingAccountId"
  | "externalReference"
  | "symbol" // Maps to 'title' in Trade model
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

export interface CanonicalFieldMeta {
  field: CanonicalField;
  label: string;
  required: boolean;
  description: string;
  example: string;
}

export const CANONICAL_FIELDS_META: CanonicalFieldMeta[] = [
  { field: "symbol", label: "Symbol / Ticker", required: true, description: "Traded instrument or pair", example: "EURUSD, AAPL" },
  { field: "side", label: "Side / Direction", required: true, description: "Trade direction (Buy/Long or Sell/Short)", example: "BUY, SHORT" },
  { field: "quantity", label: "Quantity / Size", required: true, description: "Shares, contracts, or lot size", example: "1.00, 100" },
  { field: "entryPrice", label: "Entry Price", required: true, description: "Executed fill or open price", example: "1.0850, 150.25" },
  { field: "entryDate", label: "Entry Date / Time", required: true, description: "Execution timestamp or open date", example: "2024-01-15 14:30:00" },
  { field: "exitPrice", label: "Exit Price", required: false, description: "Close or sell price", example: "1.0920, 155.00" },
  { field: "exitDate", label: "Exit Date / Time", required: false, description: "Close timestamp", example: "2024-01-15 16:45:00" },
  { field: "status", label: "Status", required: false, description: "Position status (OPEN, CLOSED, CANCELLED)", example: "CLOSED" },
  { field: "netPnl", label: "Net P&L", required: false, description: "Realized net profit/loss after costs", example: "250.50, -45.00" },
  { field: "grossPnl", label: "Gross P&L", required: false, description: "Realized gross profit/loss before costs", example: "260.00" },
  { field: "stopLoss", label: "Stop Loss", required: false, description: "Planned or trigger stop loss price", example: "1.0800" },
  { field: "takeProfit", label: "Take Profit", required: false, description: "Planned target price", example: "1.1000" },
  { field: "riskAmount", label: "Risk Amount", required: false, description: "Dollar amount risked on trade", example: "100.00" },
  { field: "commission", label: "Commission", required: false, description: "Broker commission fees", example: "3.50" },
  { field: "fees", label: "Fees", required: false, description: "Exchange or regulatory fees", example: "1.20" },
  { field: "swap", label: "Swap / Financing", required: false, description: "Overnight rollover fee or credit", example: "-0.80" },
  { field: "externalReference", label: "Ticket / Order ID", required: false, description: "Broker ticket or unique transaction ID", example: "#12948291" },
  { field: "notes", label: "Notes / Comments", required: false, description: "Execution or strategy comments", example: "Breakout setup" },
  { field: "tags", label: "Tags", required: false, description: "Comma-separated trade tags", example: "gap-fill, earnings" },
];

export const REQUIRED_CANONICAL_FIELDS: CanonicalField[] = [
  "symbol",
  "side",
  "quantity",
  "entryPrice",
  "entryDate",
];

// Maps known common column names to our CanonicalField
// Keys should be lowercase, stripped of non-alphanumeric characters for matching.
export const COMMON_ALIASES: Record<string, CanonicalField> = {
  // Symbol / Title
  symbol: "symbol",
  ticker: "symbol",
  instrument: "symbol",
  pair: "symbol",
  market: "symbol",
  asset: "symbol",
  product: "symbol",
  item: "symbol",
  contract: "symbol",
  security: "symbol",

  // Side
  side: "side",
  direction: "side",
  action: "side",
  type: "side",
  buysell: "side",
  bs: "side",

  // Status
  status: "status",
  state: "status",

  // Dates & Times
  time: "entryDate",
  date: "entryDate",
  entrytime: "entryDate",
  entrydate: "entryDate",
  opentime: "entryDate",
  opendate: "entryDate",
  opened: "entryDate",
  openat: "entryDate",
  in: "entryDate",

  exittime: "exitDate",
  exitdate: "exitDate",
  closetime: "exitDate",
  closedate: "exitDate",
  closed: "exitDate",
  closeat: "exitDate",
  out: "exitDate",

  // Prices
  price: "entryPrice",
  entryprice: "entryPrice",
  openprice: "entryPrice",
  avgprice: "entryPrice",
  entry: "entryPrice",
  open: "entryPrice",
  inprice: "entryPrice",
  buyprice: "entryPrice",

  exitprice: "exitPrice",
  closeprice: "exitPrice",
  exit: "exitPrice",
  close: "exitPrice",
  outprice: "exitPrice",
  sellprice: "exitPrice",

  // Quantity
  quantity: "quantity",
  qty: "quantity",
  volume: "quantity",
  size: "quantity",
  lots: "quantity",
  contracts: "quantity",
  shares: "quantity",
  amount: "quantity",

  // Risk
  stoploss: "stopLoss",
  sl: "stopLoss",
  stopprice: "stopLoss",
  takeprofit: "takeProfit",
  tp: "takeProfit",
  targetprice: "takeProfit",
  target: "takeProfit",
  risk: "riskAmount",
  riskamount: "riskAmount",

  // P&L
  pnl: "netPnl",
  pandl: "netPnl",
  pl: "netPnl",
  netpnl: "netPnl",
  netprofit: "netPnl",
  net: "netPnl",
  profit: "netPnl",
  profitloss: "netPnl",
  realizedpnl: "netPnl",
  realizedprofit: "netPnl",

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
  financing: "swap",
  rollover: "swap",

  // Account
  account: "tradingAccountId",
  accountid: "tradingAccountId",
  accountname: "tradingAccountId",

  // Meta
  notes: "notes",
  comment: "notes",
  comments: "notes",
  tags: "tags",
  labels: "tags",
  ticket: "externalReference",
  ticketid: "externalReference",
  order: "externalReference",
  orderid: "externalReference",
  tradeid: "externalReference",
  ref: "externalReference",
  reference: "externalReference",
  id: "externalReference",
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

export interface ColumnDetectionResult {
  mapping: ColumnMapping;
  unmappedColumns: string[];
  missingRequiredFields: CanonicalField[];
}

/**
 * Automatically inspects source headers and produces suggested column mappings,
 * identifying unmapped columns and missing required fields.
 */
export function detectColumnMappings(headers: string[]): ColumnDetectionResult {
  const mapping: ColumnMapping = {};
  const mappedCanonical = new Set<CanonicalField>();
  const unmappedColumns: string[] = [];

  for (const header of headers) {
    const suggested = suggestCanonicalMapping(header);
    if (suggested && !mappedCanonical.has(suggested)) {
      mapping[header] = suggested;
      mappedCanonical.add(suggested);
    } else {
      mapping[header] = null;
      unmappedColumns.push(header);
    }
  }

  const missingRequiredFields = REQUIRED_CANONICAL_FIELDS.filter(
    (field) => !mappedCanonical.has(field)
  );

  return {
    mapping,
    unmappedColumns,
    missingRequiredFields,
  };
}
