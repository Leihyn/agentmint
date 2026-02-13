"use client";

import { Bot, User, Wrench, Loader2 } from "lucide-react";

interface AgentCall {
  agentId: string;
  agentName: string;
  response?: string;
}

interface Props {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  activeTools?: string[];
  isStreaming?: boolean;
  agentCalls?: AgentCall[];
}

export function ChatMessage({
  role,
  content,
  toolsUsed,
  activeTools,
  isStreaming,
  agentCalls,
}: Props) {
  return (
    <div className={`flex gap-3 ${role === "user" ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          role === "assistant" ? "bg-brand-600/20" : "bg-white/10"
        }`}
      >
        {role === "assistant" ? (
          <Bot className="w-4 h-4 text-brand-400" />
        ) : (
          <User className="w-4 h-4 text-gray-400" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          role === "assistant"
            ? "bg-white/5 border border-white/10"
            : "bg-brand-600/20 border border-brand-500/30"
        }`}
      >
        {/* Active tool calls */}
        {activeTools && activeTools.length > 0 && (
          <div className="mb-2 flex gap-1.5 flex-wrap">
            {activeTools.map((tool, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 bg-brand-500/10 border border-brand-500/30
                           rounded-full text-brand-300 flex items-center gap-1 animate-pulse"
              >
                <Wrench className="w-2.5 h-2.5" />
                {tool}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-brand-400 ml-0.5 animate-pulse" />
          )}
        </p>

        {/* Agent call badges */}
        {agentCalls && agentCalls.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {agentCalls.map((call, i) =>
              call.response ? (
                <a
                  key={i}
                  href={`/agents/${call.agentId}`}
                  className="text-[10px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/30
                             rounded-full text-purple-300 flex items-center gap-1 hover:bg-purple-500/20 transition"
                >
                  <Bot className="w-2.5 h-2.5" />
                  Asked {call.agentName}
                </a>
              ) : (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/30
                             rounded-full text-purple-300 flex items-center gap-1 animate-pulse"
                >
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Asking {call.agentName}...
                </span>
              )
            )}
          </div>
        )}

        {/* Completed tool badges */}
        {toolsUsed && toolsUsed.length > 0 && !isStreaming && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {toolsUsed.map((tool, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-gray-500
                           flex items-center gap-1"
              >
                <Wrench className="w-2.5 h-2.5" />
                {tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
