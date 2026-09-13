/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/imports/smart/preview/route";
import { NextRequest } from "next/server";
import * as authSession from "@/lib/auth/session";
import * as accountService from "@/lib/trading/account/service";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/account/service", () => ({
  getTradingAccountById: vi.fn(),
}));

describe("Smart Import Preview API Security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(accountId: string | null, file: File | null) {
    const formData = new FormData();
    if (accountId) formData.append("tradingAccountId", accountId);
    if (file) formData.append("screenshot", file);

    return new NextRequest("http://localhost/api/imports/smart/preview", {
      method: "POST",
      body: formData,
    });
  }

  it("requires authentication", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("AUTH_REQUIRED"));
    
    const req = createMockRequest("acc-1", new File([""], "test.png", { type: "image/png" }));
    const res = await POST(req);
    
    expect(res.status).toBe(401);
  });

  it("rejects request missing tradingAccountId", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    
    const req = createMockRequest(null, new File([""], "test.png", { type: "image/png" }));
    const res = await POST(req);
    
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  it("rejects request missing file", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    
    const req = createMockRequest("acc-1", null);
    const res = await POST(req);
    
    expect(res.status).toBe(400);
  });

  it("rejects unsupported MIME types", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    
    // e.g. executable or arbitrary file
    const req = createMockRequest("acc-1", new File(["exe payload"], "malicious.exe", { type: "application/x-msdownload" }));
    const res = await POST(req);
    
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unsupported image format");
  });

  it("rejects access to foreign account", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    
    // Account belongs to user-2
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-2",
    } as any);

    const req = createMockRequest("acc-1", new File(["img"], "test.png", { type: "image/png" }));
    const res = await POST(req);
    
    expect(res.status).toBe(404); // Returns 404 to avoid leaking existence
  });
});
