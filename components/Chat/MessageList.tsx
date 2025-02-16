import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import type { Message } from "../../app/page";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const [renderedMessages, setRenderedMessages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convert message content to HTML using Markdown parser
  useEffect(() => {
    try {
      const newMessages = messages.map(
        (message) => marked(message.content) // Sanitize HTML to prevent XSS
      ) as string[];
      setRenderedMessages(newMessages);
    } catch (error) {
      console.error("Error parsing Markdown:", error);
      // Fallback to plain text if Markdown parsing fails
      setRenderedMessages(messages.map((message) => message.content));
    }
  }, [messages]);

  // Scroll to the bottom whenever messages are updated
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="space-y-4 mb-4 h-[60vh] overflow-y-auto">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              message.role === "user"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
            // Using dangerouslySetInnerHTML to render HTML content
            dangerouslySetInnerHTML={{ __html: renderedMessages[index] || "" }}
          />
        </div>
      ))}
      {/* Empty div to act as a scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
