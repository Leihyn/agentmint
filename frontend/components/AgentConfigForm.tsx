"use client";

import { useState } from "react";
import type { AgentConfig } from "@/lib/api";
import { ChevronDown, ChevronRight } from "lucide-react";

const ALL_TOOLS = [
  { name: "get_crypto_price", label: "Crypto Prices" },
  { name: "get_solana_token_info", label: "Solana Token Info" },
  { name: "web_search", label: "Web Search" },
  { name: "fetch_url", label: "Fetch URL" },
  { name: "calculate", label: "Calculator" },
];

interface Props {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
}

export function AgentConfigForm({ config, onChange }: Props) {
  const [showPrompt, setShowPrompt] = useState(false);

  function update(partial: Partial<AgentConfig>) {
    onChange({ ...config, ...partial });
  }

  function toggleTool(toolName: string) {
    const tools = config.enabledTools.includes(toolName)
      ? config.enabledTools.filter((t) => t !== toolName)
      : [...config.enabledTools, toolName];
    update({ enabledTools: tools });
  }

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <label className="text-sm text-gray-400 block mb-1">Greeting</label>
        <input
          type="text"
          value={config.greeting}
          onChange={(e) => update({ greeting: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Personality */}
      <div>
        <label className="text-sm text-gray-400 block mb-1">Personality</label>
        <div className="flex gap-2">
          {(
            ["analytical", "friendly", "creative", "scholarly"] as const
          ).map((p) => (
            <button
              key={p}
              onClick={() => update({ personality: p })}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                config.personality === p
                  ? "bg-brand-600 text-white"
                  : "bg-white/5 border border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div>
        <label className="text-sm text-gray-400 block mb-2">
          Enabled Tools
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_TOOLS.map((tool) => (
            <button
              key={tool.name}
              onClick={() => toggleTool(tool.name)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                config.enabledTools.includes(tool.name)
                  ? "bg-brand-600/20 border border-brand-500/50 text-brand-300"
                  : "bg-white/5 border border-white/10 text-gray-500 hover:border-white/20"
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div>
        <label className="text-sm text-gray-400 block mb-1">
          Temperature: {config.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={config.temperature}
          onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Example Prompts */}
      <div>
        <label className="text-sm text-gray-400 block mb-1">
          Example Prompts
        </label>
        {config.examplePrompts.map((prompt, i) => (
          <input
            key={i}
            type="text"
            value={prompt}
            onChange={(e) => {
              const prompts = [...config.examplePrompts];
              prompts[i] = e.target.value;
              update({ examplePrompts: prompts });
            }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mb-2
                       focus:outline-none focus:border-brand-500"
            placeholder={`Example prompt ${i + 1}`}
          />
        ))}
      </div>

      {/* System Prompt (collapsible) */}
      <div>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          {showPrompt ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          System Prompt
        </button>
        {showPrompt && (
          <textarea
            value={config.systemPrompt}
            onChange={(e) => update({ systemPrompt: e.target.value })}
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-2
                       focus:outline-none focus:border-brand-500 font-mono"
          />
        )}
      </div>
    </div>
  );
}
