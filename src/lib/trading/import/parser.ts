/**
 * Import Domain — Parser
 *
 * Base parser interface for source adapters.
 */

import { ImportParser, ParseResult } from "./types";
import { createUnsupportedSourceError } from "./errors";

export abstract class BaseParser implements ImportParser {
  abstract canHandle(file: File): boolean;
  abstract parse(file: File): Promise<ParseResult>;
}

export class FallbackParser extends BaseParser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canHandle(_file: File): boolean {
    return true; // Catch-all
  }

  async parse(file: File): Promise<ParseResult> {
    throw createUnsupportedSourceError(file.name || "Unknown");
  }
}
