# Stellar Trustline Explainer

A small, read-only tool for looking up a Stellar account's trustlines: their
limits, current balances, and how much more of each asset the account could
still receive before hitting its trust limit.

No wallet connection, no signing, no secret keys — the only input is a public
account ID, and the only data shown is what Horizon already serves publicly.

## Why

Trustline limits and liabilities are easy to misread by eye: a trust limit
does not account for liabilities already committed by open offers, and
Stellar's "unlimited" trust limit is a specific large sentinel value
(`922337203685.4775807`), not a flag. This tool does the arithmetic correctly
— in exact integer stroops, never a binary float — and shows the result
directly instead of asking the viewer to do the subtraction themselves.

## Running it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a public account ID
(starts with `G`), pick Testnet or Mainnet, and submit.

## How it works

- `lib/stellar/horizon.ts` — a small Horizon client with an injectable
  `fetch`, so the account-loading logic can be tested without a network call.
- `lib/stellar/amount.ts` — decimal-safe Stellar amount arithmetic, scaled to
  stroops as `bigint` rather than passed through a float.
- `lib/stellar/trustlines.ts` — builds the report: separates the native XLM
  balance from asset trustlines, computes remaining receiving capacity
  (`limit − balance − buying liabilities`), and recognizes the unlimited
  sentinel.
- `app/api/trustlines/route.ts` — validates the request and maps Horizon
  failures (not found, rate limited, unreachable) to distinct HTTP statuses.
- `components/TrustlineExplorer.tsx` — the one-page UI.

## Testing

```bash
npm run test
npm run typecheck
npm run lint
```

## Out of scope

This tool does not create, change, or sign any trustline or transaction. It
only reads and explains what is already on the public ledger.

## License

MIT — see [LICENSE](LICENSE).
