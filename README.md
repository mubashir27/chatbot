# 🚀 Project: Chatbot with Website Data

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project combines **Firecrawl** and **Together API** to create an intelligent chatbot that uses website data to provide accurate responses.

## 🛠️ Tools Used

1. **Firecrawl** – Extracts data from websites.
2. **Together API** – Powers the chatbot using AI.

---

## 🔍 How It Works

### 1️⃣ Extract Website Data

- **Firecrawl** visits a website and scrapes its content.
- The extracted data is saved in a structured format (e.g., Markdown).

```javascript
const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY! });
const crawlResult = (await app.crawlUrl(url, {
  limit: 10,
  scrapeOptions: { formats: ["markdown"] },
})) as CrawlStatusResponse;
```

### 2️⃣ AI-Powered Chatbot

- Uses **Qwen AI** via **Together API** to generate responses.
- Integrates website data into chatbot conversations for more relevant answers.

```javascript
await fetch("https://api.together.xyz/v1/chat/completions", {
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
    stream: true,
  }),
});
```

---

## 📌 Summary

✅ **Firecrawl** collects data from websites.

✅ **Together API** uses this data to enhance chatbot responses.

✅ The chatbot can answer questions using real website content, making it more informative and reliable.

---

## 📢 Why Use This?

- **Real-time Streaming** 🚀 – Delivers responses quickly and efficiently.

---

🚀 **Assessment Complete !**
