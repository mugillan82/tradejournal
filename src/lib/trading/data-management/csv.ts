/**
 * RFC 4180 compliant CSV generator.
 */

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  let str = String(value);

  // If string contains quotes, commas, newlines, or carriage returns, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function formatCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(",");
}

export function generateCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = formatCsvRow(headers);
  const dataLines = rows.map((row) => formatCsvRow(row));
  return [headerLine, ...dataLines].join("\r\n");
}
