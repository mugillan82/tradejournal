import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { OcrProvider, OcrResult } from "./types";

export const OCR_TIMEOUT_MS = 8000;

export class TesseractOcrProvider implements OcrProvider {
  private worker: Tesseract.Worker | null = null;
  private initializingPromise: Promise<void> | null = null;
  private activeSessionId: number = 0;

  async initialize(): Promise<void> {
    if (this.worker) return;
    if (this.initializingPromise) {
      return this.initializingPromise;
    }
    
    const sessionId = ++this.activeSessionId;

    this.initializingPromise = (async () => {
      try {
        const workerInstance = await createWorker("eng");
        if (this.activeSessionId !== sessionId) {
          // Terminated or invalidated while createWorker was pending; terminate to avoid orphan
          await workerInstance.terminate().catch(() => {});
          return;
        }
        this.worker = workerInstance;
      } finally {
        if (this.activeSessionId === sessionId) {
          this.initializingPromise = null;
        }
      }
    })();

    return this.initializingPromise;
  }

  async readText(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    void mimeType;

    return new Promise<OcrResult>((resolve, reject) => {
      let isSettled = false;

      const timer = setTimeout(async () => {
        if (isSettled) return;
        isSettled = true;
        // Kill the hanging worker to release resources and reset state
        await this.terminate().catch(() => {});
        reject(new Error(`OCR operation timed out after ${OCR_TIMEOUT_MS}ms`));
      }, OCR_TIMEOUT_MS);

      (async () => {
        try {
          if (!this.worker) {
            await this.initialize();
          }

          if (isSettled || !this.worker) {
            return;
          }

          let bufferToProcess = imageBuffer;
          try {
            const metadata = await sharp(imageBuffer).metadata();
            if (metadata.width && metadata.width < 1000) {
              const targetWidth = Math.min(1600, Math.max(800, metadata.width * 3));
              bufferToProcess = await sharp(imageBuffer)
                .resize({ width: targetWidth, kernel: "lanczos3" })
                .grayscale()
                .sharpen()
                .toBuffer();
            }
          } catch {
            bufferToProcess = imageBuffer;
          }

          if (isSettled || !this.worker) {
            return;
          }

          // tesseract.js can accept a Buffer directly in Node.js
          const { data } = await this.worker.recognize(bufferToProcess);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve({
              text: data.text || "",
              confidence: typeof data.confidence === "number" ? data.confidence : 0,
            });
          }
        } catch (error) {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            // On worker failure, terminate so next request does not reuse a corrupted worker
            await this.terminate().catch(() => {});
            reject(new Error(`OCR processing failed: ${error instanceof Error ? error.message : String(error)}`));
          }
        }
      })();
    });
  }

  async terminate(): Promise<void> {
    this.activeSessionId++;
    this.initializingPromise = null;
    if (this.worker) {
      const activeWorker = this.worker;
      this.worker = null;
      try {
        await activeWorker.terminate();
      } catch {
        // Ignore termination errors during forced teardown
      }
    }
  }
}
