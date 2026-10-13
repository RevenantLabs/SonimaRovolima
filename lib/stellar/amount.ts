/**
 * Decimal-safe arithmetic for Stellar amounts. Horizon returns amounts as
 * decimal strings with up to 7 fractional digits (one stroop); converting
 * through a binary float risks silently misreporting a trust limit or a
 * remaining capacity by a fraction of a cent.
 */
const STROOP_DECIMALS = 7;
const SCALE = 10n ** BigInt(STROOP_DECIMALS);

/** The sentinel Horizon uses for "no limit set below the protocol maximum". */
export const UNLIMITED_TRUST_LIMIT = "922337203685.4775807";

export function parseStellarAmount(value: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new RangeError(`"${value}" is not a non-negative Stellar amount.`);
  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > STROOP_DECIMALS) throw new RangeError(`"${value}" has more than 7 fractional digits.`);
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(STROOP_DECIMALS, "0"));
}

export function formatStroops(value: bigint): string {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const whole = magnitude / SCALE;
  const fraction = (magnitude % SCALE).toString().padStart(STROOP_DECIMALS, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function isUnlimitedTrustLimit(limit: string): boolean {
  return limit.trim() === UNLIMITED_TRUST_LIMIT;
}
