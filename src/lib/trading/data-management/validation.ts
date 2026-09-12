import { ExportDataset, ExportFormat, ExportFilterInput } from "./types";
import { InvalidExportParametersError, UnsupportedExportFormatError } from "./errors";

const VALID_DATASETS: ExportDataset[] = ["trades", "accounts", "journal", "full"];
const VALID_FORMATS: ExportFormat[] = ["csv", "json"];

const DATASET_ALLOWED_FORMATS: Record<ExportDataset, ExportFormat[]> = {
  trades: ["csv", "json"],
  accounts: ["csv", "json"],
  journal: ["csv", "json"],
  full: ["json"],
};

export function validateExportFilterInput(params: {
  dataset?: unknown;
  format?: unknown;
  accountId?: unknown;
  from?: unknown;
  to?: unknown;
}): ExportFilterInput {
  const { dataset, format, accountId, from, to } = params;

  if (!dataset || typeof dataset !== "string" || !VALID_DATASETS.includes(dataset as ExportDataset)) {
    throw new InvalidExportParametersError(`Invalid or missing dataset. Must be one of: ${VALID_DATASETS.join(", ")}`);
  }

  const typedDataset = dataset as ExportDataset;

  // Default format depending on dataset
  let typedFormat: ExportFormat;
  if (!format) {
    typedFormat = typedDataset === "full" ? "json" : "csv";
  } else if (typeof format !== "string" || !VALID_FORMATS.includes(format as ExportFormat)) {
    throw new InvalidExportParametersError(`Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}`);
  } else {
    typedFormat = format as ExportFormat;
  }

  const allowedFormats = DATASET_ALLOWED_FORMATS[typedDataset];
  if (!allowedFormats.includes(typedFormat)) {
    throw new UnsupportedExportFormatError(
      `Format '${typedFormat}' is not supported for dataset '${typedDataset}'. Supported formats: ${allowedFormats.join(", ")}`
    );
  }

  let parsedAccountId: string | undefined;
  let parsedFrom: string | undefined;
  let parsedTo: string | undefined;

  if (accountId && typeof accountId === "string" && accountId.trim().length > 0) {
    parsedAccountId = accountId.trim();
  }

  if (from && typeof from === "string" && from.trim().length > 0) {
    const fromDate = new Date(from.trim());
    if (isNaN(fromDate.getTime())) {
      throw new InvalidExportParametersError("Invalid 'from' date format. Must be an ISO date string.");
    }
    parsedFrom = fromDate.toISOString();
  }

  if (to && typeof to === "string" && to.trim().length > 0) {
    const toDate = new Date(to.trim());
    if (isNaN(toDate.getTime())) {
      throw new InvalidExportParametersError("Invalid 'to' date format. Must be an ISO date string.");
    }
    parsedTo = toDate.toISOString();
  }

  if (parsedFrom && parsedTo && new Date(parsedFrom) > new Date(parsedTo)) {
    throw new InvalidExportParametersError("'from' date cannot be after 'to' date.");
  }

  const result: ExportFilterInput = {
    dataset: typedDataset,
    format: typedFormat,
    ...(parsedAccountId ? { accountId: parsedAccountId } : {}),
    ...(parsedFrom ? { from: parsedFrom } : {}),
    ...(parsedTo ? { to: parsedTo } : {}),
  };

  return result;
}
