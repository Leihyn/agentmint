"use client";

import { MessageSquare, GitFork } from "lucide-react";
import { AgentAvatar } from "./AgentAvatar";
import type { AgentRecord } from "@/lib/api";

interface Props {
  agent: AgentRecord;
  showStatus?: boolean;
}

export function AgentCard({ agent, showStatus }: Props) {
  return (
    <a
      href={`/agents/${agent.agentId}`}
      className="block bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <AgentAvatar
            templateId={agent.templateId}
            name={agent.name}
          />
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            {agent.tokenSymbol && (
              <span className="text-xs text-brand-400 font-mono">
                ${agent.tokenSymbol}
              </span>
            )}
          </div>
        </div>
        {showStatus && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              agent.status === "launched"
                ? "bg-brand-600/20 text-brand-400"
                : "bg-white/10 text-gray-400"
            }`}
          >
            {agent.status}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
        {agent.description}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          {agent.totalConversations} chats
        </span>
        {agent.forkCount > 0 && (
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {agent.forkCount} forks
          </span>
        )}
        {agent.config.personality && (
          <span className="capitalize">{agent.config.personality}</span>
        )}
      </div>
    </a>
  );
}
