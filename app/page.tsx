"use client";

import { useState, type ChangeEvent, type FormEvent, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MessageList from "../components/Chat/MessageList";
import MessageInput from "../components/Chat/MessageInput";
import TypingIndicator from "../components/Chat/TypingIndicator";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// Key for localStorage
const LOCAL_STORAGE_KEY = "chat_messages";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load messages from localStorage when the component mounts
  useEffect(() => {
    setIsMounted(true);

    try {
      const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
          setMessages(parsedMessages);
        }
      }
    } catch (error) {
      console.error("Failed to load messages from localStorage:", error);
    }

    return () => setIsMounted(false);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error("Failed to save messages to localStorage:", error);
      }
    }
  }, [messages, isMounted]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    // Regex to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const foundUrls = input.match(urlRegex);

    let extractedUrl = null;

    if (foundUrls) {
      extractedUrl = foundUrls[0];

      // If the extracted URL doesn't start with "http://" or "https://", prepend "https://"
      if (!/^https?:\/\//i.test(extractedUrl)) {
        extractedUrl = `https://${extractedUrl}`;
      }
    }

    console.log("Extracted URL", extractedUrl, input);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    // Update messages with the user's message
    if (isMounted) {
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInput("");
      setIsTyping(true);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: extractedUrl, // Send extracted URL if found, otherwise null
          message: input,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Display user-friendly error message using toast
        toast.error(
          errorData.error || "Too many requests. Please try again later."
        );
        return;
      }

      // Create a bot message with an empty initial content
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      // Add the bot message to the messages list
      if (isMounted) {
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      }

      // Read the streamed response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read the response stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and append to the buffer
        buffer += decoder.decode(value, { stream: true });

        // Process each complete JSON chunk
        const chunks = buffer.split("\n");
        buffer = chunks.pop() || ""; // Save incomplete chunk for the next iteration

        for (const chunk of chunks) {
          if (!chunk.trim()) continue; // Skip empty lines

          // Skip the [DONE] message
          if (chunk === "data: [DONE]") {
            console.log("[DONE]", chunk);
            break;
          }
          console.log("reader", chunk);

          try {
            // Remove "data: " prefix and parse JSON
            const jsonString = chunk.replace(/^data: /, "");
            if (!jsonString.trim()) continue; // Skip empty JSON strings

            const json = JSON?.parse(jsonString);

            if (json.choices && json.choices[0]?.delta?.content) {
              const content = json.choices[0].delta.content;

              // Update the bot's message with the new content without duplication
              if (isMounted) {
                setMessages((prevMessages) => {
                  const updatedMessages = [...prevMessages];
                  const lastMessage =
                    updatedMessages[updatedMessages.length - 1];
                  if (lastMessage.role === "assistant") {
                    // Only append content if it hasn't been appended before
                    const currentContent = lastMessage.content.trim();
                    const contentToAdd = content.trim();

                    // Check if content is already at the end of the current message to avoid repetition
                    if (!currentContent.endsWith(contentToAdd)) {
                      lastMessage.content += content;
                    }
                  }
                  return updatedMessages;
                });
              }
            }
          } catch (error) {
            console.error("Failed to parse JSON chunk:", chunk, error);
          }
        }
      }
    } catch (error) {
      console.log("Error:", error);
      if (error instanceof Error)
        toast.error(error.message || "Something went wrong! Please try again.");
    } finally {
      if (isMounted) {
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-gray-700">
            Chat with Meru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <MessageList messages={messages} />
          {isTyping && <TypingIndicator />}
          <MessageInput
            input={input}
            handleInputChange={handleInputChange}
            onSubmit={handleSubmit}
            disabled={isTyping}
          />
        </CardContent>
      </Card>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}
