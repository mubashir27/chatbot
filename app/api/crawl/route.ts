import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url)
      return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

    const crawlResponse = await fetch("https://api.firecrawl.com/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!crawlResponse.ok) {
      throw new Error("Failed to crawl the website");
    }

    const crawlData = await crawlResponse.json();
    return NextResponse.json({ success: true, data: crawlData });
  } catch (error) {
    console.log("errorInCrawl", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
