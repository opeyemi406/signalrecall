import { NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({
    configured: isGoogleAuthConfigured(),
  });
}
