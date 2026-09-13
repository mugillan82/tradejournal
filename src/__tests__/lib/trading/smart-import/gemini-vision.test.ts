import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleGenAI } from "@google/genai";
import { GeminiVisionProvider } from "@/lib/trading/smart-import/gemini-vision";

vi.mock("server-only", () => ({}));

// Mock the SDK
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn(),
    Type: {
      OBJECT: "object",
      STRING: "string",
      NUMBER: "number",
      ARRAY: "array",
    }
  };
});

describe("GeminiVisionProvider", () => {
  let mockGenerateContent: any;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    
    mockGenerateContent = vi.fn();
    (GoogleGenAI as any).mockImplementation(function() {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should not be configured if API key is missing", () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiVisionProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it("should be configured if API key is present", () => {
    process.env.GEMINI_API_KEY = "test-key";
    const provider = new GeminiVisionProvider();
    expect(provider.isConfigured()).toBe(true);
  });

  it("should parse Gemini vision structured output successfully", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const provider = new GeminiVisionProvider();
    
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        source: "MT4",
        sourceConfidence: 0.9,
        trades: [
          { symbol: "EURUSD", side: "BUY", quantity: "1.0", entryPrice: "1.1000" }
        ]
      })
    });

    const result = await provider.extractTrades(Buffer.from("dummy"), "image/png", "OCR hints");
    
    expect(result.source).toBe("MT4");
    expect(result.sourceConfidence).toBe(0.9);
    expect(result.trades.length).toBe(1);
    expect(result.trades[0].symbol).toBe("EURUSD");
    expect(result.trades[0].entryPrice).toBe("1.1000");

    // Verify system prompt is sent with strict boundaries
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.config.systemInstruction).toContain("INJECTION DEFENSE");
    expect(callArgs.config.systemInstruction).toContain("TRUSTED INSTRUCTIONS");
    
    // Verify untrusted data isolation
    expect(callArgs.contents[0].parts[1].text).toContain("<untrusted_ocr>");
    expect(callArgs.contents[0].parts[1].text).toContain("OCR hints");
  });

  it("should gracefully handle Gemini vision failures", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const provider = new GeminiVisionProvider();
    
    mockGenerateContent.mockRejectedValueOnce(new Error("API Rate Limit Exceeded"));

    await expect(provider.extractTrades(Buffer.from("dummy"), "image/png")).rejects.toThrow("API Rate Limit Exceeded");
  });
});
