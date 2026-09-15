import { createWorker } from "tesseract.js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { OcrProvider, OcrResult } from "./types";

export const OCR_TIMEOUT_MS = 8000;

/**
 * Resolves explicit physical filesystem paths for Tesseract.js worker script and traineddata.
 * In Next.js (Turbopack/Webpack), __dirname is virtualized into /ROOT/..., breaking Node worker_threads.
 * Providing absolute physical disk paths guarantees reliable offline initialization without network delays.
 */
function getTesseractOptions() {
  const cwd = process.cwd();
  let workerPath: string | undefined;

  // 1. Check direct physical filesystem path in node_modules first
  const directPath = path.resolve(cwd, "node_modules/tesseract.js/src/worker-script/node/index.js");
  if (fs.existsSync(directPath)) {
    workerPath = directPath;
  } else {
    // 2. Fallback to require.resolve only if it returns a real file on disk
    try {
      const resolved = require.resolve("tesseract.js/src/worker-script/node/index.js");
      if (fs.existsSync(resolved)) {
        workerPath = resolved;
      }
    } catch {
      // Ignore resolution error
    }
  }

  const trainedDataInCwd = path.resolve(cwd, "eng.traineddata");
  const langPath = fs.existsSync(trainedDataInCwd) ? cwd : undefined;

  return {
    ...(workerPath ? { workerPath } : {}),
    ...(langPath ? { langPath } : {}),
    cachePath: cwd,
    gzip: false,
  };
}

export class TesseractOcrProvider implements OcrProvider {
  private worker: Tesseract.Worker | null = null;
  private initializingPromise: Promise<void> | null = null;
  private activeSessionId: number = 0;
  private executionQueue: Promise<unknown> = Promise.resolve();

  async initialize(): Promise<void> {
    if (this.worker) return;
    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    const sessionId = ++this.activeSessionId;

    this.initializingPromise = (async () => {
      try {
        const options = getTesseractOptions();
        const workerInstance = await createWorker("eng", undefined, options);
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

  async readText(imageBuffer: Buffer, mimeType: string, signal?: AbortSignal): Promise<OcrResult> {
    void mimeType;

    if (signal?.aborted) {
      throw new Error("CLIENT_ABORTED");
    }

    const runJob = async (): Promise<OcrResult> => {
      if (signal?.aborted) {
        throw new Error("CLIENT_ABORTED");
      }

      return new Promise<OcrResult>((resolve, reject) => {
        let isSettled = false;
        let abortListener: (() => void) | null = null;

        const cleanup = () => {
          if (abortListener && signal) {
            signal.removeEventListener("abort", abortListener);
            abortListener = null;
          }
        };

        const timer = setTimeout(async () => {
          if (isSettled) return;
          isSettled = true;
          cleanup();
          // Kill the hanging worker to release resources and reset state
          await this.terminate().catch(() => {});
          reject(new Error(`OCR operation timed out after ${OCR_TIMEOUT_MS}ms`));
        }, OCR_TIMEOUT_MS);

        if (signal) {
          abortListener = () => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timer);
            cleanup();
            reject(new Error("CLIENT_ABORTED"));
          };
          signal.addEventListener("abort", abortListener, { once: true });
        }

        (async () => {
          try {
            if (!this.worker) {
              await this.initialize();
            }

            if (isSettled || !this.worker) {
              cleanup();
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
              cleanup();
              return;
            }

            // tesseract.js can accept a Buffer directly in Node.js
            const { data } = await this.worker.recognize(bufferToProcess);
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              cleanup();
              resolve({
                text: data.text || "",
                confidence: typeof data.confidence === "number" ? data.confidence : 0,
              });
            }
          } catch (error) {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              cleanup();
              // On worker failure, terminate so next request does not reuse a corrupted worker
              await this.terminate().catch(() => {});
              reject(new Error(`OCR processing failed: ${error instanceof Error ? error.message : String(error)}`));
            }
          }
        })();
      });
    };

    // Serialize execution to prevent concurrent tasks from corrupting or prematurely terminating shared worker
    const jobPromise = this.executionQueue.then(runJob, runJob);
    this.executionQueue = jobPromise.then(() => {}, () => {});
    return jobPromise;
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
