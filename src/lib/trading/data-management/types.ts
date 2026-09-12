/**
 * Data Management & Export Domain — Public Types
 *
 * Strongly typed DTOs and contracts for data management overview counts,
 * exports (CSV, JSON), and full system backups.
 */

export type ExportDataset = "trades" | "accounts" | "journal" | "full";
export type ExportFormat = "csv" | "json";

export interface DataManagementOverviewDto {
  readonly accounts: number;
  readonly trades: number;
  readonly executions: number;
  readonly journalEntries: number;
  readonly tradeNotes: number;
  readonly reviews: number;
  readonly tags: number;
  readonly strategies: number;
  readonly setups: number;
  readonly mistakes: number;
  readonly attachments: number;
}

export interface ExportFilterInput {
  readonly dataset: ExportDataset;
  readonly format: ExportFormat;
  readonly accountId?: string;
  readonly from?: string;
  readonly to?: string;
}

export interface ExportResultDto {
  readonly data: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly dataset: ExportDataset;
  readonly format: ExportFormat;
  readonly recordCount: number;
}

export interface FullBackupDto {
  readonly version: string;
  readonly exportedAt: string;
  readonly accounts: ReadonlyArray<Record<string, unknown>>;
  readonly trades: ReadonlyArray<Record<string, unknown>>;
  readonly executions: ReadonlyArray<Record<string, unknown>>;
  readonly tags: ReadonlyArray<Record<string, unknown>>;
  readonly strategies: ReadonlyArray<Record<string, unknown>>;
  readonly setups: ReadonlyArray<Record<string, unknown>>;
  readonly mistakes: ReadonlyArray<Record<string, unknown>>;
  readonly journalEntries: ReadonlyArray<Record<string, unknown>>;
  readonly tradeNotes: ReadonlyArray<Record<string, unknown>>;
  readonly reviews: ReadonlyArray<Record<string, unknown>>;
  readonly attachments: ReadonlyArray<Record<string, unknown>>;
}
