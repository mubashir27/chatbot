import { NextRequest, NextResponse } from "next/server";
import FirecrawlApp, { CrawlStatusResponse } from "@mendable/firecrawl-js";
import { isValidUrl } from "@/app/utils/helper";

// Environment variables for API keys
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Validate environment variables
if (!TOGETHER_API_KEY || !FIRECRAWL_API_KEY) {
  throw new Error("Missing required environment variables.");
}

// Simple in-memory rate-limiting store
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window

export async function POST(req: NextRequest) {
  try {
    // Rate-limiting check
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const currentTime = Date.now();

    // Clean up old rate-limiting entries
    rateLimitStore.forEach((value, key) => {
      if (currentTime - value.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(key);
      }
    });

    const requestData = rateLimitStore.get(ip) || {
      count: 0,
      timestamp: currentTime,
    };

    if (requestData.count >= RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Increment request count for the IP
    rateLimitStore.set(ip, {
      count: requestData.count + 1,
      timestamp: currentTime,
    });

    // Validate request body
    const { url, message } = await req.json();
    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (url && !isValidUrl(url)) {
      return NextResponse.json(
        { error: "Invalid URL provided." },
        { status: 400 }
      );
    }

    let crawledData = "";

    // Crawl URL if provided
    if (url) {
      try {
        const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY! });
        const crawlResult = (await app.crawlUrl(url, {
          limit: 10,
          scrapeOptions: { formats: ["markdown"] },
        })) as CrawlStatusResponse;

        if (!crawlResult?.data?.[0]?.markdown) {
          throw new Error("No markdown data found in the crawled response.");
        }

        crawledData = crawlResult.data[0].markdown;
      } catch (error) {
        console.error("Failed to crawl website:", error);
        return NextResponse.json(
          { error: "Failed to crawl the provided URL. Please try again." },
          { status: 500 }
        );
      }
    }

    // Call Together API with streaming
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
          stream: true, // Enable streaming
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to get LLM response:", errorData);
      throw new Error("Failed to get LLM response.");
    }

    // Create a ReadableStream from the response body
    const stream = response.body;
    console.log("stream", stream);
    // Return the stream as the response
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
