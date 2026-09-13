/**
 * Import Domain — CSV Adapter Foundation
 *
 * Generic tabular/CSV adapter foundation without external dependencies
 * to avoid blowing up the client bundle, although we may use this on the server.
 */

import { BaseParser } from "./parser";
import { ParseResult, RawRecord } from "./types";
import { createParseError } from "./errors";

export class CsvParser extends BaseParser {
  canHandle(file: File): boolean {
    return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  }

  async parse(file: File): Promise<ParseResult> {
    const text = await file.text();
    if (!text || text.trim() === "") {
      throw createParseError("CSV file is empty.");
    }

    return this.parseCsvString(text);
  }

  parseCsvString(text: string): ParseResult {
    const records: RawRecord[] = [];
    const errors: string[] = [];

    // Simple robust CSV parser handling quotes
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
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell);
        currentCell = "";
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n for \r\n
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    
    // Add last cell/row if not empty
    if (currentCell !== "" || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    if (rows.length < 2) {
      return { records: [], errors: ["CSV does not contain enough data (missing headers or rows)."] };
    }

    // Process headers
    const rawHeaders = rows[0].map(h => h.trim());
    const headers = this.deduplicateHeaders(rawHeaders);

    // Process data rows
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      // Skip completely empty rows
      if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) {
        continue;
      }

      if (row.length !== headers.length) {
        errors.push(`Row ${rowIndex + 1} has ${row.length} columns, but header has ${headers.length}. Row skipped.`);
        continue;
      }

      const data: Record<string, string> = {};
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        data[headers[colIndex]] = row[colIndex].trim();
      }

      records.push({
        index: rowIndex, // 0-based index of the data row relative to the file (row 1 is index 1)
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
      while (seen.has(finalHeader)) {
        finalHeader = `${header}_${counter}`;
        counter++;
      }
      seen.add(finalHeader);
      return finalHeader;
    });
  }
}
