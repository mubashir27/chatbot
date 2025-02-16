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

      const data = await response.json();
      if (!data.response) {
        toast.error("Invalid response from the server.");
        return;
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
      };

      // Update messages with the bot's response
      if (isMounted) {
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      }
    } catch (error) {
      console.log("Error:", error);
      if (error instanceof Error)
        toast.error(error.message || "Something went wrong! Please try again."); // want to handle 504 gateway error
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
