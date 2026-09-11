/**
 * Classification Domain — Input Validation
 *
 * Centralized server-side validation functions for Tags, Strategies,
 * Setups, Mistakes, and Trade Classification operations.
 */

import type { FieldError } from "./errors";


export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<FieldError>;
}

function success(): ValidationResult {
  return { isValid: true, errors: [] };
}

function failure(errors: FieldError[]): ValidationResult {
  return { isValid: false, errors };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength = 100,
): FieldError | null {
  if (value === undefined || value === null) {
    return { path: fieldName, message: `${fieldName} is required` };
  }
  if (typeof value !== "string") {
    return { path: fieldName, message: `${fieldName} must be a string` };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { path: fieldName, message: `${fieldName} cannot be empty` };
  }
  if (trimmed.length > maxLength) {
    return {
      path: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }
  return null;
}

function validateOptionalString(
  value: unknown,
  fieldName: string,
  maxLength = 1000,
): FieldError | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return { path: fieldName, message: `${fieldName} must be a string` };
  }
  if (value.trim().length > maxLength) {
    return {
      path: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }
  return null;
}

function validateColor(value: unknown): FieldError | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    return { path: "color", message: "color must be a string" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  // Accept standard hex (#fff, #ffffff), rgba/rgb, or color names
  if (!/^#([0-9a-fA-F]{3}){1,2}$|^[a-zA-Z]{3,20}$/.test(trimmed)) {
    return {
      path: "color",
      message: "color must be a valid hex color code (e.g. #3b82f6) or color name",
    };
  }
  return null;
}

function rejectUnknownFields(
  input: Record<string, unknown>,
  allowedFields: ReadonlyArray<string>,
): FieldError[] {
  const errors: FieldError[] = [];
  const allowed = new Set(allowedFields);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      errors.push({
        path: key,
        message: `Field '${key}' is not recognized and cannot be set`,
      });
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Tag Validation
// ---------------------------------------------------------------------------

export function validateCreateTagInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "color"]);

  const nameErr = validateNonEmptyString(data.name, "name", 50);
  if (nameErr) errors.push(nameErr);

  const colorErr = validateColor(data.color);
  if (colorErr) errors.push(colorErr);

  return errors.length > 0 ? failure(errors) : success();
}

export function validateUpdateTagInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "color"]);

  if (Object.keys(data).length === 0) {
    return failure([{ path: "body", message: "At least one field must be provided for update" }]);
  }

  if (data.name !== undefined) {
    const nameErr = validateNonEmptyString(data.name, "name", 50);
    if (nameErr) errors.push(nameErr);
  }

  if (data.color !== undefined) {
    const colorErr = validateColor(data.color);
    if (colorErr) errors.push(colorErr);
  }

  return errors.length > 0 ? failure(errors) : success();
}

// ---------------------------------------------------------------------------
// Strategy Validation
// ---------------------------------------------------------------------------

export function validateCreateStrategyInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "description"]);

  const nameErr = validateNonEmptyString(data.name, "name", 100);
  if (nameErr) errors.push(nameErr);

  const descErr = validateOptionalString(data.description, "description", 2000);
  if (descErr) errors.push(descErr);

  return errors.length > 0 ? failure(errors) : success();
}

export function validateUpdateStrategyInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "description"]);

  if (Object.keys(data).length === 0) {
    return failure([{ path: "body", message: "At least one field must be provided for update" }]);
  }

  if (data.name !== undefined) {
    const nameErr = validateNonEmptyString(data.name, "name", 100);
    if (nameErr) errors.push(nameErr);
  }

  if (data.description !== undefined) {
    const descErr = validateOptionalString(data.description, "description", 2000);
    if (descErr) errors.push(descErr);
  }

  return errors.length > 0 ? failure(errors) : success();
}

// ---------------------------------------------------------------------------
// Setup Validation
// ---------------------------------------------------------------------------

export function validateCreateSetupInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "description"]);

  const nameErr = validateNonEmptyString(data.name, "name", 100);
  if (nameErr) errors.push(nameErr);

  const descErr = validateOptionalString(data.description, "description", 2000);
  if (descErr) errors.push(descErr);

  return errors.length > 0 ? failure(errors) : success();
}

export function validateUpdateSetupInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "description"]);

  if (Object.keys(data).length === 0) {
    return failure([{ path: "body", message: "At least one field must be provided for update" }]);
  }

  if (data.name !== undefined) {
    const nameErr = validateNonEmptyString(data.name, "name", 100);
    if (nameErr) errors.push(nameErr);
  }

  if (data.description !== undefined) {
    const descErr = validateOptionalString(data.description, "description", 2000);
    if (descErr) errors.push(descErr);
  }

  return errors.length > 0 ? failure(errors) : success();
}

// ---------------------------------------------------------------------------
// Mistake Validation
// ---------------------------------------------------------------------------

export function validateCreateMistakeInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "description"]);

  const nameErr = validateNonEmptyString(data.name, "name", 100);
  if (nameErr) errors.push(nameErr);

  const descErr = validateOptionalString(data.description, "description", 2000);
  if (descErr) errors.push(descErr);

  return errors.length > 0 ? failure(errors) : success();
}

export function validateUpdateMistakeInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["name", "description"]);

  if (Object.keys(data).length === 0) {
    return failure([{ path: "body", message: "At least one field must be provided for update" }]);
  }

  if (data.name !== undefined) {
    const nameErr = validateNonEmptyString(data.name, "name", 100);
    if (nameErr) errors.push(nameErr);
  }

  if (data.description !== undefined) {
    const descErr = validateOptionalString(data.description, "description", 2000);
    if (descErr) errors.push(descErr);
  }

  return errors.length > 0 ? failure(errors) : success();
}

// ---------------------------------------------------------------------------
// Trade Association Validation
// ---------------------------------------------------------------------------

export function validateAssignTradeTagsInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["tagIds"]);

  if (!Array.isArray(data.tagIds)) {
    return failure([{ path: "tagIds", message: "tagIds must be an array of string IDs" }]);
  }

  for (let i = 0; i < data.tagIds.length; i++) {
    const id = data.tagIds[i];
    if (typeof id !== "string" || id.trim().length === 0) {
      errors.push({
        path: `tagIds[${i}]`,
        message: "Each tag ID must be a non-empty string",
      });
    }
  }

  return errors.length > 0 ? failure(errors) : success();
}

export function validateAssignTradeMistakesInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["mistakeIds"]);

  if (!Array.isArray(data.mistakeIds)) {
    return failure([{ path: "mistakeIds", message: "mistakeIds must be an array of string IDs" }]);
  }

  for (let i = 0; i < data.mistakeIds.length; i++) {
    const id = data.mistakeIds[i];
    if (typeof id !== "string" || id.trim().length === 0) {
      errors.push({
        path: `mistakeIds[${i}]`,
        message: "Each mistake ID must be a non-empty string",
      });
    }
  }

  return errors.length > 0 ? failure(errors) : success();
}

export function validateAssignTradeStrategyInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["strategyId"]);

  if (data.strategyId !== null && data.strategyId !== undefined) {
    if (typeof data.strategyId !== "string" || data.strategyId.trim().length === 0) {
      errors.push({
        path: "strategyId",
        message: "strategyId must be a non-empty string or null",
      });
    }
  }

  return errors.length > 0 ? failure(errors) : success();
}

export function validateAssignTradeSetupInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([{ path: "body", message: "Request body must be an object" }]);
  }
  const data = input as Record<string, unknown>;
  const errors: FieldError[] = rejectUnknownFields(data, ["setupId"]);

  if (data.setupId !== null && data.setupId !== undefined) {
    if (typeof data.setupId !== "string" || data.setupId.trim().length === 0) {
      errors.push({
        path: "setupId",
        message: "setupId must be a non-empty string or null",
      });
    }
  }

  return errors.length > 0 ? failure(errors) : success();
}
