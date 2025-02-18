"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
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

const LOCAL_STORAGE_KEY = "chat_messages";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages) || []);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  }, [messages]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const foundUrls = input.match(urlRegex);
    let extractedUrl = foundUrls
      ? `https://${foundUrls[0].replace(/^https?:\/\//, "")}`
      : null;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: extractedUrl, message: input }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Server error. Please try again.");
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, botMessage]);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to read response stream.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.trim() || chunk === "data: [DONE]") continue;

          try {
            const json = JSON.parse(chunk.replace(/^data: /, ""));
            if (json.choices?.[0]?.delta?.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMessage.id
                    ? {
                        ...m,
                        content: m.content + json.choices[0].delta.content,
                      }
                    : m
                )
              );
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong!"
      );
    } finally {
      setIsTyping(false);
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
        hideProgressBar
        closeOnClick
        draggable
        pauseOnHover
      />
    </div>
  );
}
