/**
 * Reports Domain — Validation
 *
 * Validates report filter inputs.
 */

import { validateAnalyticsFilterInput, type AnalyticsValidationResult } from "../analytics/validation";

export type ReportValidationResult = AnalyticsValidationResult;

/**
 * Validate and sanitize report filter inputs.
 */
export function validateReportFilterInput(rawInput: unknown): ReportValidationResult {
  return validateAnalyticsFilterInput(rawInput);
}
