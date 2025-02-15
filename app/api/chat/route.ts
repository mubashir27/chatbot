import { NextRequest, NextResponse } from "next/server";
import FirecrawlApp from "@mendable/firecrawl-js";

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY; // Store in .env file

export async function POST(req: NextRequest) {
  try {
    const { url, message } = await req.json();
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    let crawledData = "";

    if (url) {
      try {
        const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY! });
        const crawlResult = await app.crawlUrl(url, {
          limit: 10,
          scrapeOptions: { formats: ["markdown"] },
        });

        if (crawlResult?.pages?.length) {
          crawledData = crawlResult.pages
            .map((page) => page.content)
            .join("\n\n");
        }

        console.log("crawledData", crawledData);
      } catch (error) {
        console.error("Failed to crawl website:", error);
      }
    }

    const response = await fetch(
      "https://api.together.xyz/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-72B-Instruct-Turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant that uses website data to enhance responses.",
            },
            {
              role: "user",
              content: crawledData
                ? `Website data: ${crawledData}\n\nUser query: ${message}`
                : message,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get LLM response");
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      response: data.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
