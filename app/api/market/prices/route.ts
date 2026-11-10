import { NextResponse } from "next/server";
import { fetchAllTatumRates, isTatumConfigured } from "@/lib/server/tatum";

export async function GET() {
  const configured = isTatumConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      provider: "tatum",
      assets: [],
      error: "TATUM_API_KEY is not configured. Add your key to .env to stream live market prices.",
    });
  }

  const result = await fetchAllTatumRates();
  return NextResponse.json(result);
}
