import { NextResponse } from "next/server";
import { createHttpHorizonClient } from "@/lib/stellar/horizon";
import { parseTrustlinesRequest } from "@/lib/stellar/schema";
import { buildTrustlineReport } from "@/lib/stellar/trustlines";

export const dynamic = "force-dynamic";

const STATUS_BY_ERROR_CODE: Record<string, number> = {
  not_found: 404,
  rate_limited: 429,
  provider: 502,
  network: 502,
  unexpected: 500
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseTrustlinesRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const client = createHttpHorizonClient();
  const result = await buildTrustlineReport(client, parsed.value.accountId, parsed.value.network);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.code, message: result.error.message },
      { status: STATUS_BY_ERROR_CODE[result.error.code] ?? 500 }
    );
  }

  return NextResponse.json({ report: result.value }, { headers: { "cache-control": "no-store" } });
}
