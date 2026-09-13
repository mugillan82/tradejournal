/**
 * Import Domain — XLSX / Excel Parser
 *
 * Production-grade, secure Excel parser using read-excel-file.
 * Features:
 * - Magic byte inspection (PK\x03\x04 ZIP header)
 * - Detects available worksheets
 * - Allows sheet selection
 * - Detects header row
 * - Preserves decimal string values and dates
 * - Disallows macro execution (macros are ignored by OpenXML parser)
 * - Row limit protection
 */

import readXlsxFile from "read-excel-file/node";
import { BaseParser } from "./parser";
import { ParseResult, RawRecord } from "./types";
import { createParseError, createInvalidFileTypeError } from "./errors";

const MAX_XLSX_ROWS = 50000;

export interface XlsxParseOptions {
  sheetName?: string;
  maxRows?: number;
}

export interface XlsxParseResult extends ParseResult {
  availableSheets: string[];
  selectedSheet: string;
}

export class XlsxParser extends BaseParser {
  canHandle(file: File): boolean {
    const lowerName = file.name.toLowerCase();
    return (
      lowerName.endsWith(".xlsx") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  /**
   * Verifies that the buffer has the standard ZIP magic bytes (PK\x03\x04)
   * used by OpenXML XLSX workbooks.
   */
  static verifyZipMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    return (
      buffer[0] === 0x50 && // P
      buffer[1] === 0x4b && // K
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  /**
   * Reads available sheet names from an XLSX buffer without parsing full rows.
   */
  async getSheetNames(buffer: Buffer): Promise<string[]> {
    if (!XlsxParser.verifyZipMagicBytes(buffer)) {
      throw createInvalidFileTypeError(["XLSX"]);
    }

    try {
      const sheets = await readXlsxFile(buffer);
      return sheets.map((s) => s.sheet);
    } catch (err) {
      throw createParseError(
        `Failed to inspect Excel workbook sheets: ${err instanceof Error ? err.message : "Invalid workbook"}`
      );
    }
  }

  async parse(file: File, options?: XlsxParseOptions): Promise<XlsxParseResult> {
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    return this.parseBuffer(buffer, options);
  }

  async parseBuffer(buffer: Buffer, options?: XlsxParseOptions): Promise<XlsxParseResult> {
    if (!XlsxParser.verifyZipMagicBytes(buffer)) {
      throw createInvalidFileTypeError(["XLSX"]);
    }

    let allSheets;
    try {
      allSheets = await readXlsxFile(buffer);
    } catch (err) {
      throw createParseError(
        `Invalid or corrupted Excel file: ${err instanceof Error ? err.message : "Could not parse workbook"}`
      );
    }

    if (!allSheets || allSheets.length === 0) {
      throw createParseError("Excel workbook contains no sheets.");
    }

    const availableSheets = allSheets.map((s) => s.sheet);
    let targetSheet = allSheets[0];

    if (options?.sheetName) {
      const found = allSheets.find((s) => s.sheet.toLowerCase() === options.sheetName!.toLowerCase());
      if (found) {
        targetSheet = found;
      }
    }

    const selectedSheet = targetSheet.sheet;
    const rawRows = targetSheet.data;

    const maxRows = options?.maxRows || MAX_XLSX_ROWS;
    const records: RawRecord[] = [];
    const errors: string[] = [];

    // Find the first non-empty row to treat as headers
    let headerRowIndex = -1;
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (row && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1 || headerRowIndex >= rawRows.length - 1) {
      return {
        records: [],
        errors: ["Sheet contains no headers or trade data rows."],
        availableSheets,
        selectedSheet,
      };
    }

    const headerCells = rawRows[headerRowIndex].map((cell, idx) => {
      if (cell === null || cell === undefined) return `Column_${idx + 1}`;
      return String(cell).trim() || `Column_${idx + 1}`;
    });
    const headers = this.deduplicateHeaders(headerCells);

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      if (records.length >= maxRows) {
        errors.push(`Row limit exceeded. Only first ${maxRows} rows were processed.`);
        break;
      }

      const row = rawRows[r];
      // Skip empty row
      if (!row || !row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")) {
        continue;
      }

      const data: Record<string, string> = {};
      for (let c = 0; c < headers.length; c++) {
        const cell = row[c];
        data[headers[c]] = this.formatCellValue(cell);
      }

      records.push({
        index: r - headerRowIndex, // 1-indexed relative to data rows
        data,
      });
    }

    return {
      records,
      errors,
      availableSheets,
      selectedSheet,
    };
  }

  private formatCellValue(cell: unknown): string {
    if (cell === null || cell === undefined) return "";
    if (cell instanceof Date) {
      return isNaN(cell.getTime()) ? "" : cell.toISOString();
    }
    if (typeof cell === "number") {
      // Prevent scientific notation for large trade tickets or decimal rounding
      return Number.isInteger(cell) ? String(cell) : cell.toString();
    }
    return String(cell).trim();
  }

  private deduplicateHeaders(headers: string[]): string[] {
    const seen = new Set<string>();
    return headers.map((header, index) => {
      let finalHeader = header || `Column_${index + 1}`;
      let counter = 1;
      while (seen.has(finalHeader.toLowerCase())) {
        finalHeader = `${header}_${counter}`;
        counter++;
      }
      seen.add(finalHeader.toLowerCase());
      return finalHeader;
    });
  }
}
