import { NextResponse } from "next/server";
import { fetchSuiNetworkTelemetry, isTatumConfigured } from "@/lib/server/tatum";

export async function GET() {
  const telemetry = await fetchSuiNetworkTelemetry();
  return NextResponse.json({
    tatumConfigured: isTatumConfigured(),
    telemetry,
  });
}
