import { describe, expect, it } from "vitest";
import { isValidAccountId, parseTrustlinesRequest } from "@/lib/stellar/schema";

const VALID_ACCOUNT = "GA".padEnd(56, "A");

describe("isValidAccountId", () => {
  it("accepts a well-formed public key", () => {
    expect(isValidAccountId(VALID_ACCOUNT)).toBe(true);
  });

  it("rejects a secret seed, a wrong-length string, and non-strings", () => {
    expect(isValidAccountId("S".padEnd(56, "A"))).toBe(false);
    expect(isValidAccountId("GAAAA")).toBe(false);
    expect(isValidAccountId(null)).toBe(false);
    expect(isValidAccountId(12345)).toBe(false);
  });
});

describe("parseTrustlinesRequest", () => {
  it("accepts a valid request", () => {
    const parsed = parseTrustlinesRequest({ accountId: VALID_ACCOUNT, network: "testnet" });
    expect(parsed).toEqual({ ok: true, value: { accountId: VALID_ACCOUNT, network: "testnet" } });
  });

  it("rejects an invalid account id before an invalid network", () => {
    expect(parseTrustlinesRequest({ accountId: "bad", network: "testnet" })).toEqual({ ok: false, error: "invalid_account" });
  });

  it("rejects an unsupported network", () => {
    expect(parseTrustlinesRequest({ accountId: VALID_ACCOUNT, network: "futurenet" })).toEqual({ ok: false, error: "invalid_network" });
  });

  it("rejects a non-object body", () => {
    expect(parseTrustlinesRequest(null)).toEqual({ ok: false, error: "invalid_account" });
    expect(parseTrustlinesRequest("string")).toEqual({ ok: false, error: "invalid_account" });
  });
});
