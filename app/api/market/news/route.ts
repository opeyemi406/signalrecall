import { NextResponse } from "next/server";

export interface MarketNewsItem {
  id: string;
  category: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image?: string;
  timestamp: number;
}

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!finnhubKey) {
    return NextResponse.json({
      configured: false,
      items: [],
      error: "FINNHUB_API_KEY not configured in environment",
    });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=crypto&token=${finnhubKey}`,
      { next: { revalidate: 180 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        {
          configured: true,
          items: [],
          error: `Finnhub returned status ${res.status}`,
        },
        { status: res.status }
      );
    }

    const raw = (await res.json()) as Array<{
      id: number;
      category: string;
      datetime: number;
      headline: string;
      summary: string;
      source: string;
      url: string;
      image?: string;
    }>;

    const items: MarketNewsItem[] = raw.slice(0, 15).map((item) => ({
      id: String(item.id),
      category: item.category || "crypto",
      headline: item.headline,
      summary: item.summary || "",
      source: item.source || "Market Wire",
      url: item.url,
      image: item.image || undefined,
      timestamp: item.datetime * 1000,
    }));

    return NextResponse.json({
      configured: true,
      provider: "finnhub",
      count: items.length,
      items,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        configured: false,
        items: [],
        error: `Failed to fetch live market news: ${msg}`,
      },
      { status: 500 }
    );
  }
}
