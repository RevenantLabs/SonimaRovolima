import type { ReactNode } from "react";

export const metadata = {
  title: "Stellar Trustline Explainer",
  description: "Look up a Stellar account's trustlines, limits, and remaining receiving capacity."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
