"use client";

import { Bot, Rocket, MessageSquare } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto pt-16 pb-12">
        <h1 className="text-5xl font-bold gradient-text mb-6">
          Mint AI Agents That Earn
        </h1>
        <p className="text-xl text-gray-400 mb-10 leading-relaxed">
          Describe an agent. We build its brain, launch its token, and deploy it
          live. Every trade funds the creator.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/create"
            className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg
                       font-semibold text-lg transition"
          >
            Create an Agent
          </a>
          <a
            href="/agents"
            className="border border-white/20 hover:border-white/40 text-white px-8 py-3
                       rounded-lg font-semibold text-lg transition"
          >
            Browse Agents
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Bot className="w-6 h-6 text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Describe</h3>
          <p className="text-sm text-gray-400">
            Tell us what your agent should do. Pick a template or write a
            description. AI generates the brain.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-6 h-6 text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Launch a Token</h3>
          <p className="text-sm text-gray-400">
            Your agent gets its own Solana token on Bags. Every trade generates
            fees that flow to you.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Anyone Can Chat</h3>
          <p className="text-sm text-gray-400">
            Your agent goes live immediately. Users chat with it, trade its
            token, and the best agents rise.
          </p>
        </div>
      </div>
    </div>
  );
}
