import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrustlineExplorer } from "@/components/TrustlineExplorer";

const VALID_ACCOUNT = "G".padEnd(56, "A");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TrustlineExplorer", () => {
  it("labels the account input and network select so the flow is reachable by keyboard", () => {
    render(<TrustlineExplorer />);
    expect(screen.getByLabelText("Account ID")).toBeTruthy();
    expect(screen.getByLabelText("Network")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Explain trustlines" })).toBeTruthy();
  });

  it("rejects an invalid account id without calling the API", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<TrustlineExplorer />);
    fireEvent.change(screen.getByLabelText("Account ID"), { target: { value: "not-an-account" } });
    fireEvent.click(screen.getByRole("button", { name: "Explain trustlines" }));
    expect(screen.getByRole("alert").textContent).toMatch(/valid Stellar public key/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the trustline table once a report comes back", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          report: {
            accountId: VALID_ACCOUNT,
            network: "testnet",
            native: { balance: "100.0000000", buyingLiabilities: "0", sellingLiabilities: "0" },
            trustlines: [
              {
                assetCode: "USDC",
                assetIssuer: "G".padEnd(56, "B"),
                balance: "50",
                limit: "1000",
                unlimited: false,
                buyingLiabilities: "0",
                sellingLiabilities: "0",
                remainingReceivingCapacity: "950",
                authorized: true,
                clawbackEnabled: false
              }
            ]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    render(<TrustlineExplorer />);
    fireEvent.change(screen.getByLabelText("Account ID"), { target: { value: VALID_ACCOUNT } });
    fireEvent.click(screen.getByRole("button", { name: "Explain trustlines" }));

    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    expect(screen.getByText("USDC")).toBeTruthy();
    expect(screen.getByText("950")).toBeTruthy();
  });
});
