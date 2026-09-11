/**
 * Classification Domain — Types
 *
 * Server-only typed DTOs and mutation inputs for Tags, Strategies, Setups,
 * Mistakes, and Trade Classification Associations.
 */

export interface TagDto {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly createdAt: Date;
  readonly tradeCount?: number;
}

export interface CreateTagInput {
  readonly name: string;
  readonly color?: string | null;
}

export interface UpdateTagInput {
  readonly name?: string;
  readonly color?: string | null;
}

export interface StrategyDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly tradeCount?: number;
}

export interface CreateStrategyInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface UpdateStrategyInput {
  readonly name?: string;
  readonly description?: string | null;
}

export interface SetupDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly tradeCount?: number;
}

export interface CreateSetupInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface UpdateSetupInput {
  readonly name?: string;
  readonly description?: string | null;
}

export interface MistakeDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly tradeCount?: number;
}

export interface CreateMistakeInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface UpdateMistakeInput {
  readonly name?: string;
  readonly description?: string | null;
}

export interface TradeClassificationSummaryDto {
  readonly tradeId: string;
  readonly strategy: StrategyDto | null;
  readonly setup: SetupDto | null;
  readonly tags: ReadonlyArray<TagDto>;
  readonly mistakes: ReadonlyArray<MistakeDto>;
}

export interface AssignTradeTagsInput {
  readonly tagIds: ReadonlyArray<string>;
}

export interface AssignTradeMistakesInput {
  readonly mistakeIds: ReadonlyArray<string>;
}

export interface AssignTradeStrategyInput {
  readonly strategyId: string | null;
}

export interface AssignTradeSetupInput {
  readonly setupId: string | null;
}
