import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ build: vi.fn() }));
vi.mock("@/lib/stellar/trustlines", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stellar/trustlines")>("@/lib/stellar/trustlines");
  return { ...actual, buildTrustlineReport: mocks.build };
});

import { POST } from "@/app/api/trustlines/route";

const VALID_ACCOUNT = "G".padEnd(56, "A");

function request(body: unknown): Request {
  return new Request("http://localhost/api/trustlines", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/trustlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid account before calling Horizon", async () => {
    const response = await POST(request({ accountId: "bad", network: "testnet" }));
    expect(response.status).toBe(400);
    expect(mocks.build).not.toHaveBeenCalled();
  });

  it("returns the report for a valid request", async () => {
    mocks.build.mockResolvedValue({ ok: true, value: { accountId: VALID_ACCOUNT, network: "testnet", native: null, trustlines: [] } });
    const response = await POST(request({ accountId: VALID_ACCOUNT, network: "testnet" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.report.accountId).toBe(VALID_ACCOUNT);
  });

  it("maps a not_found error to a 404", async () => {
    mocks.build.mockResolvedValue({ ok: false, error: { code: "not_found", message: "no such account" } });
    const response = await POST(request({ accountId: VALID_ACCOUNT, network: "testnet" }));
    expect(response.status).toBe(404);
  });
});
