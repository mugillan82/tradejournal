/**
 * Smart Import — Image Dimension & Signature Validation
 *
 * Validates binary image signatures and extracts dimensions from
 * PNG, JPEG, and WebP image buffers without loading full image pixels into memory.
 * Enforces width, height, total pixel count, and byte size limits before OCR.
 */

export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;
export const MAX_IMAGE_PIXELS = 16_000_000; // 16 Megapixels (e.g. 4000x4000)
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface ImageDimensions {
  width: number;
  height: number;
  format: "PNG" | "JPEG" | "WEBP";
}

export interface ImageValidationResult {
  isValid: boolean;
  dimensions?: ImageDimensions;
  error?: string;
}

/**
 * Checks magic byte signatures for supported image formats.
 */
export function validateImageSignature(buffer: Buffer): { isValid: boolean; format?: "PNG" | "JPEG" | "WEBP" } {
  if (!buffer || buffer.length < 12) {
    return { isValid: false };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { isValid: true, format: "PNG" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { isValid: true, format: "JPEG" };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, format: "WEBP" };
  }

  return { isValid: false };
}

/**
 * Extracts width and height directly from PNG, JPEG, or WebP binary headers.
 */
export function extractImageDimensions(buffer: Buffer): ImageDimensions | null {
  const sig = validateImageSignature(buffer);
  if (!sig.isValid || !sig.format) {
    return null;
  }

  try {
    if (sig.format === "PNG") {
      // PNG IHDR chunk starts at offset 8.
      // Offset 12..15: 'IHDR'
      // Offset 16..19: width (UInt32BE)
      // Offset 20..23: height (UInt32BE)
      if (buffer.length < 24) return null;
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return { width, height, format: "PNG" };
      }
    }

    if (sig.format === "JPEG") {
      // Walk JPEG markers starting at offset 2
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF markers: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2), SOF3 (0xC3),
        // SOF5..SOF7 (0xC5..0xC7), SOF9..SOF11 (0xC9..0xCB), SOF13..SOF15 (0xCD..0xCF)
        const isSof =
          (marker >= 0xC0 && marker <= 0xC3) ||
          (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) ||
          (marker >= 0xCD && marker <= 0xCF);

        if (isSof) {
          // SOF header: length (2 bytes), precision (1 byte), height (2 bytes), width (2 bytes)
          if (offset + 9 > buffer.length) return null;
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) {
            return { width, height, format: "JPEG" };
          }
        }

        // Move to next segment
        const length = buffer.readUInt16BE(offset + 2);
        if (length < 2) break; // Corrupt marker length
        offset += 2 + length;
      }
    }

    if (sig.format === "WEBP") {
      // WebP chunks at offset 12
      if (buffer.length < 30) return null;
      const chunkType = buffer.toString("ascii", 12, 16);

      // VP8 (lossy): chunkType == "VP8 "
      if (chunkType === "VP8 " && buffer.length >= 30) {
        // Start code at 23..25 must be 9D 01 2A
        if (buffer[23] === 0x9D && buffer[24] === 0x01 && buffer[25] === 0x2A) {
          const width = buffer.readUInt16LE(26) & 0x3FFF;
          const height = buffer.readUInt16LE(28) & 0x3FFF;
          return { width, height, format: "WEBP" };
        }
      }

      // VP8L (lossless): chunkType == "VP8L"
      if (chunkType === "VP8L" && buffer.length >= 25) {
        if (buffer[20] === 0x2F) {
          const b0 = buffer[21];
          const b1 = buffer[22];
          const b2 = buffer[23];
          const b3 = buffer[24];
          const width = 1 + (((b1 & 0x3F) << 8) | b0);
          const height = 1 + (((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
          return { width, height, format: "WEBP" };
        }
      }

      // VP8X (extended): chunkType == "VP8X"
      if (chunkType === "VP8X" && buffer.length >= 30) {
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height, format: "WEBP" };
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Validates file size, magic bytes signature, and explicit image dimensions.
 */
export function validateImage(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: "Image file is empty." };
  }

  if (buffer.length > MAX_IMAGE_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of 5 MB.`,
    };
  }

  const sig = validateImageSignature(buffer);
  if (!sig.isValid) {
    return { isValid: false, error: "Invalid image signature. Supported formats are PNG, JPEG, and WebP." };
  }

  const dimensions = extractImageDimensions(buffer);
  if (!dimensions) {
    return { isValid: false, error: "Unable to parse image dimensions. File header may be corrupt or malformed." };
  }

  if (dimensions.width > MAX_IMAGE_WIDTH) {
    return {
      isValid: false,
      dimensions,
      error: `Image width (${dimensions.width}px) exceeds maximum allowed limit of ${MAX_IMAGE_WIDTH}px.`,
    };
  }

  if (dimensions.height > MAX_IMAGE_HEIGHT) {
    return {
      isValid: false,
      dimensions,
      error: `Image height (${dimensions.height}px) exceeds maximum allowed limit of ${MAX_IMAGE_HEIGHT}px.`,
    };
  }

  const totalPixels = dimensions.width * dimensions.height;
  if (totalPixels > MAX_IMAGE_PIXELS) {
    return {
      isValid: false,
      dimensions,
      error: `Image total pixel count (${totalPixels.toLocaleString()} px) exceeds maximum allowed limit of ${MAX_IMAGE_PIXELS.toLocaleString()} px.`,
    };
  }

  return { isValid: true, dimensions };
}
