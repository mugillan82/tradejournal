import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { TesseractOcrProvider, OCR_TIMEOUT_MS } from "@/lib/trading/smart-import/ocr";
import sharp from "sharp";

describe("Smart Import Timeout & OCR Lifecycle Verification", () => {
  it("1. terminates worker and releases resources on explicit terminate()", async () => {
    const provider = new TesseractOcrProvider();
    
    // Initialize provider
    await provider.initialize();
    
    // Terminate provider cleanly
    await provider.terminate();

    // Calling terminate again should be a safe no-op
    await expect(provider.terminate()).resolves.toBeUndefined();
  });

  it(
    "2. handles genuine OCR timeout by cleaning up resources and rejecting with bounded timeout error",
    { timeout: 15000 },
    async () => {
    const provider = new TesseractOcrProvider();

    // Create small valid test image buffer
    const testImg = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    // Mock worker recognize to hang past OCR_TIMEOUT_MS
    const originalInit = provider.initialize.bind(provider);
    vi.spyOn(provider, "initialize").mockImplementation(async () => {
      await originalInit();
      // Inject a hanging recognize implementation on the underlying worker
      const worker = (provider as unknown as { worker: { recognize: () => Promise<never> } }).worker;
      if (worker) {
        worker.recognize = () => new Promise<never>(() => {
          // Intentionally never resolves to simulate hanging OCR
        });
      }
    });

    const start = performance.now();
    await expect(provider.readText(testImg, "image/png")).rejects.toThrow(
      `OCR operation timed out after ${OCR_TIMEOUT_MS}ms`
    );
    const duration = performance.now() - start;

    // Verify it timed out within bounded window (+ margin)
    expect(duration).toBeGreaterThanOrEqual(OCR_TIMEOUT_MS - 50);
    expect(duration).toBeLessThan(OCR_TIMEOUT_MS + 2000);

    // Verify worker is cleaned up (null) after timeout
    const currentWorker = (provider as unknown as { worker: unknown }).worker;
    expect(currentWorker).toBeNull();

    // Clean up
    await provider.terminate();
  });

  it("3. immediately aborts OCR execution when AbortSignal is cancelled", async () => {
    const provider = new TesseractOcrProvider();

    const testImg = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const controller = new AbortController();

    // Trigger abort shortly after starting
    setTimeout(() => {
      controller.abort();
    }, 50);

    const start = performance.now();
    await expect(
      provider.readText(testImg, "image/png", controller.signal)
    ).rejects.toThrow("CLIENT_ABORTED");
    const duration = performance.now() - start;

    // Must abort promptly without waiting for OCR completion or timeout
    expect(duration).toBeLessThan(1000);

    await provider.terminate();
  });

  it("4. rejects immediately if AbortSignal is already aborted before starting", async () => {
    const provider = new TesseractOcrProvider();

    const testImg = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const controller = new AbortController();
    controller.abort();

    await expect(
      provider.readText(testImg, "image/png", controller.signal)
    ).rejects.toThrow("CLIENT_ABORTED");

    await provider.terminate();
  });

  it("5. serializes requests cleanly through the execution queue without race conditions", async () => {
    const provider = new TesseractOcrProvider();

    const testImg = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    // Fire two requests concurrently
    const p1 = provider.readText(testImg, "image/png");
    const p2 = provider.readText(testImg, "image/png");

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(typeof r1.confidence).toBe("number");
    expect(typeof r2.confidence).toBe("number");

    await provider.terminate();
  });
});
