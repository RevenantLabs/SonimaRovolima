import { formatStroops, isUnlimitedTrustLimit, parseStellarAmount } from "./amount";
import type { HorizonBalance, HorizonClient } from "./horizon";
import { HorizonError } from "./horizon";
import type { StellarNetwork } from "./schema";

export type TrustlineRow = {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  limit: string;
  unlimited: boolean;
  buyingLiabilities: string;
  sellingLiabilities: string;
  /**
   * How much more of this asset the account could receive before hitting
   * its trust limit: limit minus balance minus buying liabilities already
   * earmarked by open offers. Null when the limit is unlimited (there is
   * nothing to subtract from).
   */
  remainingReceivingCapacity: string | null;
  authorized: boolean;
  clawbackEnabled: boolean;
};

export type NativeBalance = {
  balance: string;
  buyingLiabilities: string;
  sellingLiabilities: string;
};

export type TrustlineReport = {
  accountId: string;
  network: StellarNetwork;
  native: NativeBalance | null;
  trustlines: TrustlineRow[];
};

export type TrustlineReportError = {
  code: "not_found" | "rate_limited" | "provider" | "network" | "unexpected";
  message: string;
};

function isTrustlineBalance(balance: HorizonBalance): boolean {
  return balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12";
}

function toTrustlineRow(balance: HorizonBalance): TrustlineRow | null {
  if (!balance.asset_code || !balance.asset_issuer || balance.limit === undefined) return null;

  const unlimited = isUnlimitedTrustLimit(balance.limit);
  const buyingLiabilities = balance.buying_liabilities ?? "0";

  let remainingReceivingCapacity: string | null = null;
  if (!unlimited) {
    const limit = parseStellarAmount(balance.limit);
    const used = parseStellarAmount(balance.balance) + parseStellarAmount(buyingLiabilities);
    const remaining = limit - used;
    // A negative remainder would mean the account is over its own limit,
    // which should never happen on a consistent ledger snapshot — clamp to
    // zero rather than display a confusing negative "capacity".
    remainingReceivingCapacity = formatStroops(remaining > 0n ? remaining : 0n);
  }

  return {
    assetCode: balance.asset_code,
    assetIssuer: balance.asset_issuer,
    balance: balance.balance,
    limit: balance.limit,
    unlimited,
    buyingLiabilities,
    sellingLiabilities: balance.selling_liabilities ?? "0",
    remainingReceivingCapacity,
    authorized: balance.is_authorized ?? true,
    clawbackEnabled: balance.is_clawback_enabled ?? false
  };
}

export async function buildTrustlineReport(
  client: HorizonClient,
  accountId: string,
  network: StellarNetwork
): Promise<{ ok: true; value: TrustlineReport } | { ok: false; error: TrustlineReportError }> {
  try {
    const account = await client.loadAccount(accountId, network);

    const nativeBalance = account.balances.find((b) => b.asset_type === "native");
    const native: NativeBalance | null = nativeBalance
      ? {
          balance: nativeBalance.balance,
          buyingLiabilities: nativeBalance.buying_liabilities ?? "0",
          sellingLiabilities: nativeBalance.selling_liabilities ?? "0"
        }
      : null;

    const trustlines = account.balances
      .filter(isTrustlineBalance)
      .map(toTrustlineRow)
      .filter((row): row is TrustlineRow => row !== null)
      .sort((a, b) => a.assetCode.localeCompare(b.assetCode) || a.assetIssuer.localeCompare(b.assetIssuer));

    return { ok: true, value: { accountId, network, native, trustlines } };
  } catch (error) {
    if (error instanceof HorizonError) return { ok: false, error: { code: error.kind, message: error.message } };
    return { ok: false, error: { code: "unexpected", message: "The trustline report could not be built." } };
  }
}
