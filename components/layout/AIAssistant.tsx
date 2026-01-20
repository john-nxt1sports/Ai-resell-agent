"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/store/uiStore";
import { useAIChat } from "@/lib/ai/hooks";
import {
  X,
  Send,
  Sparkles,
  TrendingUp,
  DollarSign,
  Image as ImageIcon,
  Tag,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    label: "Optimize Title",
    prompt: "Help me optimize this listing title for better visibility",
  },
  {
    icon: DollarSign,
    label: "Suggest Price",
    prompt: "What price should I set for this item?",
  },
  {
    icon: ImageIcon,
    label: "Image Tips",
    prompt: "Give me tips for better product photos",
  },
  {
    icon: Tag,
    label: "Generate Tags",
    prompt: "Generate SEO tags for my listing",
  },
];

export function AIAssistant() {
  const { aiAssistantOpen: isAIAssistantOpen, toggleAIAssistant } =
    useUIStore();
  const { loading: aiLoading, error: aiError, sendMessage } = useAIChat();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your AI listing assistant powered by Claude 3.5 Sonnet. I can help you optimize titles, suggest pricing, generate descriptions, and provide marketplace insights. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isAIAssistantOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Prevent background scroll on mobile overlay
    if (typeof window !== "undefined") {
      if (isAIAssistantOpen) {
        document.body.classList.add("overflow-hidden");
      } else {
        document.body.classList.remove("overflow-hidden");
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        document.body.classList.remove("overflow-hidden");
      }
    };
  }, [isAIAssistantOpen]);

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || aiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Send to AI
    const conversationHistory = [...messages, userMessage].map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const aiResponse = await sendMessage(conversationHistory);

    if (aiResponse) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else if (aiError) {
      // Show error message in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I'm sorry, I encountered an error: ${aiError}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isAIAssistantOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
        onClick={toggleAIAssistant}
        aria-hidden="true"
      />

      {/* Assistant Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-dark-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isAIAssistantOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-800 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                AI Assistant
              </h2>
              <p className="text-xs text-dark-600 dark:text-dark-400">
                Powered by GPT-4
              </p>
            </div>
          </div>
          <button
            onClick={toggleAIAssistant}
            className="p-2 hover:bg-white/50 dark:hover:bg-dark-800/50 rounded-lg transition-colors"
            aria-label="Close AI Assistant"
          >
            <X className="h-5 w-5 text-dark-600 dark:text-dark-400" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-800 bg-dark-50 dark:bg-dark-800/50">
          <p className="text-xs font-medium text-dark-600 dark:text-dark-400 mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.prompt)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-dark-200 dark:border-dark-700 rounded-lg transition-colors"
                disabled={aiLoading}
              >
                <action.icon className="h-4 w-4 text-primary-500" />
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white"
                    : "bg-dark-100 dark:bg-dark-800 text-dark-900 dark:text-dark-50"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === "user"
                      ? "text-primary-100"
                      : "text-dark-500 dark:text-dark-400"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-dark-100 dark:bg-dark-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    AI is thinking...
                  </p>
                </div>
              </div>
            </div>
          )}

          {aiError && !aiLoading && (
            <div className="flex justify-start">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {aiError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={aiLoading}
                className="w-full px-4 py-3 rounded-xl border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || aiLoading}
              className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-2 text-center">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </>
  );
}
