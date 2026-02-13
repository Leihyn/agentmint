"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AgentCard } from "@/components/AgentCard";
import { listAgents, listAllAgents, type AgentRecord } from "@/lib/api";

export default function AgentsDirectoryPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"launched" | "all">("all");

  useEffect(() => {
    setLoading(true);
    const fetcher = filter === "launched" ? listAgents : listAllAgents;
    fetcher()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Directory</h1>
          <p className="text-gray-400 text-sm mt-1">
            Browse and chat with AI agents. The best agents rise.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "launched"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition ${
                filter === f
                  ? "bg-brand-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>No agents yet.</p>
          <a
            href="/create"
            className="text-brand-400 hover:underline text-sm mt-2 inline-block"
          >
            Create the first one
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
