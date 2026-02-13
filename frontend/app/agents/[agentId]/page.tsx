"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ExternalLink, GitFork } from "lucide-react";
import { ChatInterface } from "@/components/ChatInterface";
import { ClaimButton } from "@/components/ClaimButton";
import {
  getAgent,
  getAgentStats,
  getClaimablePositions,
  type AgentRecord,
  type TokenStats,
} from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();
  const { publicKey } = useWallet();

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [claimable, setClaimable] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    getAgent(agentId)
      .then((a) => {
        setAgent(a);
        if (a.mint) {
          getAgentStats(agentId).then(setStats).catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(() => {
    if (!publicKey || !agent?.mint) return;
    getClaimablePositions(publicKey.toBase58())
      .then((data) => {
        const pos = data.positions.find((p) => p.mint === agent.mint);
        if (pos) setClaimable(pos.claimableAmount);
      })
      .catch(console.error);
  }, [publicKey, agent]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20 text-gray-500">Agent not found.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Chat (left 60%) */}
      <div className="lg:col-span-3">
        <ChatInterface
          agentId={agent.agentId}
          greeting={agent.config.greeting}
          examplePrompts={agent.config.examplePrompts}
        />
      </div>

      {/* Sidebar (right 40%) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Agent info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-bold">{agent.name}</h2>
            <button
              onClick={() => router.push(`/create?fork=${agent.agentId}`)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/5 border border-white/10
                         rounded-lg text-gray-400 hover:border-white/20 hover:text-white transition"
            >
              <GitFork className="w-3.5 h-3.5" />
              Fork
              {agent.forkCount > 0 && (
                <span className="text-gray-500 ml-0.5">{agent.forkCount}</span>
              )}
            </button>
          </div>

          {agent.forkedFrom && (
            <a
              href={`/agents/${agent.forkedFrom}`}
              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline mb-2"
            >
              <GitFork className="w-3 h-3" />
              Forked from {agent.forkedFrom}
            </a>
          )}

          <p className="text-sm text-gray-400 mb-3">{agent.description}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full capitalize">
              {agent.config.personality}
            </span>
            {agent.status === "launched" && (
              <span className="text-xs px-2 py-0.5 bg-brand-600/20 text-brand-400 rounded-full">
                Live
              </span>
            )}
            {agent.tokenSymbol && (
              <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full font-mono">
                ${agent.tokenSymbol}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              {agent.totalConversations} conversations / {agent.totalMessages}{" "}
              messages
            </span>
            {agent.forkCount > 0 && (
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                {agent.forkCount} forks
              </span>
            )}
          </div>
        </div>

        {/* Token stats */}
        {stats && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Token Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Price</div>
                <div className="text-sm font-medium">
                  ${stats.price.toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Market Cap</div>
                <div className="text-sm font-medium">
                  ${stats.marketCap.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Holders</div>
                <div className="text-sm font-medium">{stats.holders}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Lifetime Fees</div>
                <div className="text-sm font-medium">
                  {stats.lifetimeFees.toFixed(4)} SOL
                </div>
              </div>
            </div>

            {agent.mint && (
              <a
                href={`https://bags.fm/token/${agent.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-xs text-brand-400 hover:underline flex items-center gap-1"
              >
                Trade on Bags <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Team */}
        {agent.teamMembers && agent.teamMembers.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Team</h3>
            <div className="space-y-2">
              {agent.teamMembers.map((tm, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-300 truncate flex-1">
                    {tm.label}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {(tm.bps / 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claim */}
        {agent.mint && claimable > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <ClaimButton mint={agent.mint} claimableAmount={claimable} />
          </div>
        )}
      </div>
    </div>
  );
}
