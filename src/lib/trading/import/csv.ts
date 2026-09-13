/**
 * Import Domain — CSV Adapter Foundation
 *
 * Robust CSV parser handling UTF-8, BOM, delimiters (comma, semicolon, tab),
 * quoted fields, escaped quotes, newlines in quotes, and malformed rows.
 */

import { BaseParser } from "./parser";
import { ParseResult, RawRecord } from "./types";
import { createParseError } from "./errors";

const MAX_CSV_ROWS = 50000;

export interface CsvParseOptions {
  delimiter?: string;
  maxRows?: number;
}

export class CsvParser extends BaseParser {
  canHandle(file: File): boolean {
    return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  }

  async parse(file: File, options?: CsvParseOptions): Promise<ParseResult> {
    const text = await file.text();
    if (!text || text.trim() === "") {
      throw createParseError("CSV file is empty.");
    }

    return this.parseCsvString(text, options);
  }

  /**
   * Detects delimiter from CSV string by inspecting the header row outside quotes.
   */
  detectDelimiter(text: string): string {
    let insideQuotes = false;
    let headerLine = "";
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        headerLine = text.slice(0, i);
        break;
      }
    }
    if (!headerLine) {
      headerLine = text;
    }

    // Count candidate delimiters outside quotes in headerLine
    let commaCount = 0;
    let semicolonCount = 0;
    let tabCount = 0;
    insideQuotes = false;

    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (!insideQuotes) {
        if (char === ',') commaCount++;
        else if (char === ';') semicolonCount++;
        else if (char === '\t') tabCount++;
      }
    }

    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
    return ',';
  }

  parseCsvString(rawText: string, options?: CsvParseOptions): ParseResult {
    // 1. Strip UTF-8 Byte Order Mark (BOM) if present
    let text = rawText;
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    if (!text || text.trim() === "") {
      return { records: [], errors: ["CSV file is empty."] };
    }

    const delimiter = options?.delimiter || this.detectDelimiter(text);
    const maxRows = options?.maxRows || MAX_CSV_ROWS;

    const records: RawRecord[] = [];
    const errors: string[] = [];

    // Robust RFC 4180 parser handling quotes, escaped quotes (""), and multiline values
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = i < text.length - 1 ? text[i + 1] : null;

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote ""
          currentCell += '"';
          i++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentCell);
        currentCell = "";
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n for CRLF
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";

        if (rows.length > maxRows + 1) {
          errors.push(`Row limit exceeded. Only the first ${maxRows} rows were processed.`);
          break;
        }
      } else {
        currentCell += char;
      }
    }

    // Add last cell/row if not empty or if it ended cleanly
    if (currentCell !== "" || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    if (insideQuotes) {
      errors.push("CSV contains unmatched quotes. File may be corrupted or truncated.");
    }

    if (rows.length < 2) {
      return { records: [], errors: ["CSV does not contain enough data (missing headers or rows)."] };
    }

    // Process headers
    const rawHeaders = rows[0].map(h => h.trim());
    const headers = this.deduplicateHeaders(rawHeaders);

    // Process data rows
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      if (records.length >= maxRows) {
        break;
      }

      const row = rows[rowIndex];

      // Skip completely empty rows
      if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) {
        continue;
      }

      // If column count mismatches, report error but do not throw
      if (row.length !== headers.length) {
        errors.push(`Row ${rowIndex + 1} has ${row.length} columns, expected ${headers.length}. Row skipped.`);
        continue;
      }

      const data: Record<string, string> = {};
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        data[headers[colIndex]] = row[colIndex].trim();
      }

      records.push({
        index: rowIndex, // 1-indexed relative to data rows
        data,
      });
    }

    return { records, errors };
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
