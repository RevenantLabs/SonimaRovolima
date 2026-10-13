import type { StellarNetwork } from "./schema";

const HORIZON_URLS: Record<StellarNetwork, string> = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org"
};

export class HorizonError extends Error {
  constructor(
    message: string,
    readonly kind: "not_found" | "rate_limited" | "provider" | "network"
  ) {
    super(message);
  }
}

/** The subset of Horizon's account resource this project reads. */
export type HorizonBalance = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  limit?: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
  is_authorized?: boolean;
  is_authorized_to_maintain_liabilities?: boolean;
  is_clawback_enabled?: boolean;
};

export type HorizonAccount = {
  account_id: string;
  balances: HorizonBalance[];
};

export interface HorizonClient {
  loadAccount(accountId: string, network: StellarNetwork): Promise<HorizonAccount>;
}

export function createHttpHorizonClient(fetchImpl: typeof fetch = fetch): HorizonClient {
  return {
    async loadAccount(accountId, network) {
      const url = `${HORIZON_URLS[network]}/accounts/${accountId}`;
      let response: Response;
      try {
        response = await fetchImpl(url, { signal: AbortSignal.timeout(12_000) });
      } catch {
        throw new HorizonError("Horizon could not be reached.", "network");
      }

      if (response.status === 404) throw new HorizonError("No account exists at this address on this network.", "not_found");
      if (response.status === 429) throw new HorizonError("Horizon rate-limited this request.", "rate_limited");
      if (!response.ok) throw new HorizonError(`Horizon returned HTTP ${response.status}.`, "provider");

      const body = (await response.json()) as Partial<HorizonAccount>;
      if (!body || !Array.isArray(body.balances)) throw new HorizonError("Horizon returned an unexpected account shape.", "provider");

      return body as HorizonAccount;
    }
  };
}
