import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAndScoreCatalysts } from "@/lib/server/catalysts";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const result = await fetchAndScoreCatalysts(userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { configured: false, catalysts: [], error: msg },
      { status: 500 }
    );
  }
}
