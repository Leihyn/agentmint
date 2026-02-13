"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Loader2, Bot } from "lucide-react";
import { AgentCard } from "@/components/AgentCard";
import { getMyAgents, type AgentRecord } from "@/lib/api";

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyAgents(publicKey.toBase58())
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-gray-400">
          Connect your wallet to see your agents
        </h2>
        <WalletMultiButton />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Agents</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage agents you&apos;ve created.
          </p>
        </div>
        <a
          href="/create"
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg
                     text-sm font-medium transition"
        >
          Create New Agent
        </a>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <Bot className="w-12 h-12 text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-400">
            No agents yet
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Create your first AI agent and start earning.
          </p>
          <a
            href="/create"
            className="mt-4 text-brand-400 hover:underline text-sm"
          >
            Create an Agent
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.agentId} agent={agent} showStatus />
          ))}
        </div>
      )}
    </div>
  );
}
