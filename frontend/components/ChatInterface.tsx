"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import {
  chatWithAgentStream,
  fetchLiveGreeting,
  type ChatStreamEvent,
} from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";

interface AgentCall {
  agentId: string;
  agentName: string;
  response?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  activeTools?: string[];
  isStreaming?: boolean;
  agentCalls?: AgentCall[];
}

interface Props {
  agentId: string;
  greeting: string;
  examplePrompts: string[];
}

export function ChatInterface({ agentId, greeting, examplePrompts }: Props) {
  const { publicKey } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Fetch live greeting on mount
  useEffect(() => {
    if (greetingLoaded) return;
    setGreetingLoaded(true);

    // Start with a streaming assistant message
    setMessages([{ role: "assistant", content: "", isStreaming: true }]);

    fetchLiveGreeting(agentId, (event) => {
      handleStreamEvent(event, 0);
    }).catch(() => {
      // Fallback to static greeting
      setMessages([{ role: "assistant", content: greeting }]);
    });
  }, [agentId, greeting, greetingLoaded]);

  const handleStreamEvent = useCallback(
    (event: ChatStreamEvent, messageIndex: number) => {
      switch (event.type) {
        case "text":
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                content: msg.content + event.content,
              };
            }
            return updated;
          });
          break;
        case "tool_call":
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                activeTools: [...(msg.activeTools || []), event.name],
              };
            }
            return updated;
          });
          break;
        case "tool_result":
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                activeTools: (msg.activeTools || []).filter(
                  (t) => t !== event.name
                ),
                toolsUsed: [...(msg.toolsUsed || []), event.name],
              };
            }
            return updated;
          });
          break;
        case "agent_call":
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                agentCalls: [
                  ...(msg.agentCalls || []),
                  { agentId: event.agentId, agentName: event.agentName },
                ],
              };
            }
            return updated;
          });
          break;
        case "agent_result":
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              const calls = [...(msg.agentCalls || [])];
              const idx = calls.findIndex(
                (c) => c.agentId === event.agentId && !c.response
              );
              if (idx >= 0) {
                calls[idx] = { ...calls[idx], response: event.response };
              }
              updated[messageIndex] = { ...msg, agentCalls: calls };
            }
            return updated;
          });
          break;
        case "done":
          if (event.conversationId) {
            setConversationId(event.conversationId);
          }
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                isStreaming: false,
                activeTools: [],
                toolsUsed: event.toolsUsed.length > 0
                  ? event.toolsUsed
                  : msg.toolsUsed,
              };
            }
            return updated;
          });
          setLoading(false);
          break;
        case "error":
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                content: msg.content || `Error: ${event.message}`,
                isStreaming: false,
                activeTools: [],
              };
            }
            return updated;
          });
          setLoading(false);
          break;
      }
    },
    []
  );

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const assistantMsg: Message = {
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    const assistantIndex = messages.length + 1; // +1 for userMsg

    try {
      await chatWithAgentStream(
        agentId,
        text.trim(),
        (event) => handleStreamEvent(event, assistantIndex),
        conversationId,
        publicKey?.toBase58()
      );
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const msg = updated[assistantIndex];
        if (msg) {
          updated[assistantIndex] = {
            ...msg,
            content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
            isStreaming: false,
          };
        }
        return updated;
      });
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  // Show example prompts only after greeting is done and no user messages yet
  const showExamples =
    messages.length <= 1 &&
    !loading &&
    messages[0] &&
    !messages[0].isStreaming;

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            toolsUsed={msg.toolsUsed}
            activeTools={msg.activeTools}
            isStreaming={msg.isStreaming}
            agentCalls={msg.agentCalls}
          />
        ))}
      </div>

      {/* Example prompts */}
      {showExamples && examplePrompts.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-3">
          {examplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-full
                         text-gray-400 hover:border-white/20 hover:text-white transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm
                     placeholder:text-gray-500 focus:outline-none focus:border-brand-500 transition
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-lg
                     transition disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
