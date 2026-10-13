export type StellarNetwork = "testnet" | "mainnet";

/** Stellar public keys are 56-character base32 strings starting with 'G'. */
const PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

export function isStellarNetwork(value: unknown): value is StellarNetwork {
  return value === "testnet" || value === "mainnet";
}

export function isValidAccountId(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_KEY_PATTERN.test(value);
}

export type TrustlinesRequest = {
  accountId: string;
  network: StellarNetwork;
};

export type TrustlinesRequestError = "invalid_account" | "invalid_network";

export function parseTrustlinesRequest(
  raw: unknown
): { ok: true; value: TrustlinesRequest } | { ok: false; error: TrustlinesRequestError } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid_account" };
  const record = raw as Record<string, unknown>;

  if (!isValidAccountId(record.accountId)) return { ok: false, error: "invalid_account" };
  if (!isStellarNetwork(record.network)) return { ok: false, error: "invalid_network" };

  return { ok: true, value: { accountId: record.accountId, network: record.network } };
}
