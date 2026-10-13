"use client";

import { useState, type FormEvent } from "react";
import type { StellarNetwork } from "@/lib/stellar/schema";
import type { TrustlineReport } from "@/lib/stellar/trustlines";

const ACCOUNT_PATTERN = /^G[A-Z2-7]{55}$/;

function formatLimit(row: { limit: string; unlimited: boolean }): string {
  return row.unlimited ? "Unlimited" : row.limit;
}

export function TrustlineExplorer() {
  const [accountId, setAccountId] = useState("");
  const [network, setNetwork] = useState<StellarNetwork>("testnet");
  const [report, setReport] = useState<TrustlineReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = accountId.trim();
    if (!ACCOUNT_PATTERN.test(trimmed)) {
      setError("Enter a valid Stellar public key (starts with G, 56 characters).");
      setReport(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/trustlines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: trimmed, network })
      });
      const body = (await response.json()) as { report?: TrustlineReport; error?: string; message?: string };
      if (!response.ok || !body.report) throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`);
      setReport(body.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Stellar Trustline Explainer</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>
        Look up any public Stellar account&apos;s trustlines, their limits, and how much more of each asset the
        account could still receive. Read-only — no wallet connection, no signing, public data only.
      </p>

      <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <label style={{ display: "flex", flexDirection: "column", flex: "1 1 320px", gap: "0.25rem" }}>
          <span>Account ID</span>
          <input
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            placeholder="G..."
            style={{ fontFamily: "monospace", padding: "0.5rem", border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Network</span>
          <select
            value={network}
            onChange={(event) => setNetwork(event.target.value as StellarNetwork)}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 6 }}
          >
            <option value="testnet">Testnet</option>
            <option value="mainnet">Mainnet</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{ alignSelf: "end", padding: "0.5rem 1rem", borderRadius: 6, border: "1px solid #333", background: busy ? "#eee" : "#fff" }}
        >
          {busy ? "Looking up…" : "Explain trustlines"}
        </button>
      </form>

      <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
        {busy ? "Looking up trustlines" : report ? "Trustline report ready" : error ?? ""}
      </div>

      {error && (
        <p role="alert" style={{ padding: "0.75rem 1rem", background: "#fdecea", border: "1px solid #f5c2c0", borderRadius: 6 }}>
          {error}
        </p>
      )}

      {report && (
        <section aria-label="Trustline report">
          {report.native && (
            <p>
              Native XLM balance: <strong>{report.native.balance}</strong>
            </p>
          )}

          {report.trustlines.length === 0 ? (
            <p>This account has no asset trustlines on {report.network}.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
              <caption style={{ textAlign: "left", marginBottom: "0.5rem", color: "#555" }}>
                {report.trustlines.length} trustline(s) for {report.accountId}
              </caption>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Asset</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Issuer</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Balance</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Limit</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Remaining capacity</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {report.trustlines.map((row) => (
                  <tr key={`${row.assetCode}-${row.assetIssuer}`}>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>{row.assetCode}</td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", fontFamily: "monospace", fontSize: "0.85em" }}>
                      {row.assetIssuer.slice(0, 6)}…{row.assetIssuer.slice(-6)}
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", textAlign: "right" }}>{row.balance}</td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", textAlign: "right" }}>{formatLimit(row)}</td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", textAlign: "right" }}>
                      {row.unlimited ? "Unlimited" : row.remainingReceivingCapacity}
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                      {!row.authorized && "unauthorized "}
                      {row.clawbackEnabled && "clawback-enabled"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
