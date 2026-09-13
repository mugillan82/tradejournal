import { createWorker } from "tesseract.js";
import { OcrProvider, OcrResult } from "./types";

export class TesseractOcrProvider implements OcrProvider {
  private worker: Tesseract.Worker | null = null;

  async initialize(): Promise<void> {
    if (this.worker) return;
    
    // Create the worker locally
    this.worker = await createWorker("eng");
  }

  async readText(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    void mimeType;
    if (!this.worker) {
      await this.initialize();
    }

    try {
      // tesseract.js can accept a Buffer directly in Node.js
      const { data } = await this.worker!.recognize(imageBuffer);
      return {
        text: data.text,
        confidence: data.confidence, // typically 0-100 scale from tesseract
      };
    } catch (error) {
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
