import { describe, expect, it } from "vitest";
import { HorizonError, type HorizonAccount, type HorizonClient } from "@/lib/stellar/horizon";
import { buildTrustlineReport } from "@/lib/stellar/trustlines";

const ACCOUNT_ID = "G".padEnd(56, "A");

function clientReturning(account: HorizonAccount): HorizonClient {
  return { async loadAccount() { return account; } };
}

function clientThrowing(error: HorizonError): HorizonClient {
  return {
    async loadAccount() {
      throw error;
    }
  };
}

describe("buildTrustlineReport", () => {
  it("separates the native balance from asset trustlines and sorts trustlines by code", async () => {
    const client = clientReturning({
      account_id: ACCOUNT_ID,
      balances: [
        { asset_type: "native", balance: "100.5000000" },
        { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "ISSUER_USDC", balance: "50", limit: "1000" },
        { asset_type: "credit_alphanum4", asset_code: "AQUA", asset_issuer: "ISSUER_AQUA", balance: "10", limit: "100" }
      ]
    });

    const result = await buildTrustlineReport(client, ACCOUNT_ID, "testnet");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.native?.balance).toBe("100.5000000");
    expect(result.value.trustlines.map((t) => t.assetCode)).toEqual(["AQUA", "USDC"]);
  });

  it("computes remaining receiving capacity as limit minus balance minus buying liabilities", async () => {
    const client = clientReturning({
      account_id: ACCOUNT_ID,
      balances: [
        {
          asset_type: "credit_alphanum4",
          asset_code: "USDC",
          asset_issuer: "ISSUER",
          balance: "300",
          limit: "1000",
          buying_liabilities: "50"
        }
      ]
    });

    const result = await buildTrustlineReport(client, ACCOUNT_ID, "testnet");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.trustlines[0].remainingReceivingCapacity).toBe("650");
  });

  it("reports an unlimited trustline without a numeric remaining capacity", async () => {
    const client = clientReturning({
      account_id: ACCOUNT_ID,
      balances: [
        { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "ISSUER", balance: "5", limit: "922337203685.4775807" }
      ]
    });

    const result = await buildTrustlineReport(client, ACCOUNT_ID, "testnet");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.trustlines[0].unlimited).toBe(true);
    expect(result.value.trustlines[0].remainingReceivingCapacity).toBeNull();
  });

  it("clamps remaining capacity at zero rather than showing a negative number", async () => {
    const client = clientReturning({
      account_id: ACCOUNT_ID,
      balances: [
        { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "ISSUER", balance: "900", limit: "1000", buying_liabilities: "200" }
      ]
    });

    const result = await buildTrustlineReport(client, ACCOUNT_ID, "testnet");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.trustlines[0].remainingReceivingCapacity).toBe("0");
  });

  it("returns an account with no native balance as native: null rather than throwing", async () => {
    const client = clientReturning({ account_id: ACCOUNT_ID, balances: [] });
    const result = await buildTrustlineReport(client, ACCOUNT_ID, "testnet");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.native).toBeNull();
    expect(result.value.trustlines).toHaveLength(0);
  });

  it("keeps a missing account distinguishable from other provider failures", async () => {
    const notFound = await buildTrustlineReport(clientThrowing(new HorizonError("gone", "not_found")), ACCOUNT_ID, "testnet");
    expect(notFound).toEqual({ ok: false, error: { code: "not_found", message: "gone" } });

    const rateLimited = await buildTrustlineReport(clientThrowing(new HorizonError("slow down", "rate_limited")), ACCOUNT_ID, "testnet");
    expect(rateLimited).toEqual({ ok: false, error: { code: "rate_limited", message: "slow down" } });
  });
});
