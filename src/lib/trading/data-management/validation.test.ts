import { describe, it, expect } from "vitest";
import { validateExportFilterInput } from "./validation";
import { InvalidExportParametersError, UnsupportedExportFormatError } from "./errors";

describe("validateExportFilterInput", () => {
  it("validates valid trades csv export parameters", () => {
    const res = validateExportFilterInput({ dataset: "trades", format: "csv" });
    expect(res).toEqual({
      dataset: "trades",
      format: "csv",
    });
  });

  it("defaults format correctly when omitted", () => {
    expect(validateExportFilterInput({ dataset: "trades" })).toEqual({
      dataset: "trades",
      format: "csv",
    });
    expect(validateExportFilterInput({ dataset: "full" })).toEqual({
      dataset: "full",
      format: "json",
    });
  });

  it("rejects invalid dataset", () => {
    expect(() => validateExportFilterInput({ dataset: "invalid" })).toThrow(InvalidExportParametersError);
    expect(() => validateExportFilterInput({})).toThrow(InvalidExportParametersError);
  });

  it("rejects invalid format", () => {
    expect(() => validateExportFilterInput({ dataset: "trades", format: "xml" })).toThrow(InvalidExportParametersError);
  });

  it("rejects unsupported format for dataset (e.g. full backup in CSV)", () => {
    expect(() => validateExportFilterInput({ dataset: "full", format: "csv" })).toThrow(UnsupportedExportFormatError);
  });

  it("validates date filters and accountId", () => {
    const res = validateExportFilterInput({
      dataset: "trades",
      format: "csv",
      accountId: "acc_123",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z",
    });

    expect(res.accountId).toBe("acc_123");
    expect(res.from).toBe("2026-01-01T00:00:00.000Z");
    expect(res.to).toBe("2026-01-31T23:59:59.999Z");
  });

  it("rejects invalid date strings", () => {
    expect(() =>
      validateExportFilterInput({
        dataset: "trades",
        format: "csv",
        from: "not-a-date",
      })
    ).toThrow(InvalidExportParametersError);
  });

  it("rejects from date after to date", () => {
    expect(() =>
      validateExportFilterInput({
        dataset: "trades",
        format: "csv",
        from: "2026-02-01T00:00:00.000Z",
        to: "2026-01-01T00:00:00.000Z",
      })
    ).toThrow(InvalidExportParametersError);
  });
});
