import { describe, expect, it } from "vitest";
import { formatStroops, isUnlimitedTrustLimit, parseStellarAmount } from "@/lib/stellar/amount";

describe("parseStellarAmount / formatStroops", () => {
  it("round-trips a whole number", () => {
    expect(formatStroops(parseStellarAmount("1000"))).toBe("1000");
  });

  it("round-trips a fractional amount down to one stroop", () => {
    expect(formatStroops(parseStellarAmount("1234.5678901"))).toBe("1234.5678901");
  });

  it("rejects more than 7 fractional digits rather than silently truncating", () => {
    expect(() => parseStellarAmount("1.123456789")).toThrow();
  });

  it("rejects a negative or non-numeric amount", () => {
    expect(() => parseStellarAmount("-5")).toThrow();
    expect(() => parseStellarAmount("abc")).toThrow();
  });

  it("recognizes the protocol's unlimited trust-limit sentinel", () => {
    expect(isUnlimitedTrustLimit("922337203685.4775807")).toBe(true);
    expect(isUnlimitedTrustLimit("1000")).toBe(false);
  });
});
