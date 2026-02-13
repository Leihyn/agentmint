import * as bags from "../services/bags.service";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

// --- get_crypto_price ---
const getCryptoPrice: ToolDefinition = {
  name: "get_crypto_price",
  description:
    "Get current price data for cryptocurrencies. Supports BTC, ETH, SOL, and many others via CoinGecko.",
  inputSchema: {
    type: "object",
    properties: {
      coins: {
        type: "string",
        description:
          'Comma-separated CoinGecko IDs (e.g. "bitcoin,ethereum,solana")',
      },
      currency: {
        type: "string",
        description: 'Fiat currency for prices (default "usd")',
      },
    },
    required: ["coins"],
  },
  async execute(input) {
    const coins = String(input.coins);
    const currency = String(input.currency || "usd");
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coins)}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`
      );
      if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
      const data = await res.json();
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error fetching prices: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  },
};

// --- get_solana_token_info ---
const getSolanaTokenInfo: ToolDefinition = {
  name: "get_solana_token_info",
  description:
    "Get stats for a Solana token by its mint address — price, market cap, holders, lifetime fees.",
  inputSchema: {
    type: "object",
    properties: {
      mint: {
        type: "string",
        description: "Solana token mint address",
      },
    },
    required: ["mint"],
  },
  async execute(input) {
    try {
      const stats = await bags.getTokenStats(String(input.mint));
      return JSON.stringify(stats, null, 2);
    } catch (err) {
      return `Error fetching token info: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  },
};

// --- web_search ---
const webSearch: ToolDefinition = {
  name: "web_search",
  description:
    "Search the web for current information on any topic. Returns a summary of search results.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query",
      },
    },
    required: ["query"],
  },
  async execute(input) {
    const query = String(input.query);
    try {
      // Use DuckDuckGo HTML search as a lightweight search
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AgentMint/1.0; +https://agentmint.dev)",
          },
        }
      );
      if (!res.ok)
        return `Search failed with status ${res.status}`;
      const html = await res.text();
      // Extract result snippets from DuckDuckGo HTML
      const results: string[] = [];
      const snippetRegex =
        /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      while ((match = snippetRegex.exec(html)) !== null && results.length < 5) {
        const text = match[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .trim();
        if (text) results.push(text);
      }
      if (results.length === 0)
        return `No results found for: ${query}`;
      return `Search results for "${query}":\n\n${results.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}`;
    } catch (err) {
      return `Search error: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  },
};

// --- fetch_url ---
const fetchUrl: ToolDefinition = {
  name: "fetch_url",
  description:
    "Fetch a URL and extract its text content. Useful for reading articles, docs, or web pages.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to fetch",
      },
    },
    required: ["url"],
  },
  async execute(input) {
    const url = String(input.url);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AgentMint/1.0; +https://agentmint.dev)",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return `Fetch failed: ${res.status} ${res.statusText}`;
      const html = await res.text();
      // Strip HTML tags for a rough text extraction
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);
      return text || "No content extracted from URL.";
    } catch (err) {
      return `Fetch error: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  },
};

// --- calculate ---
const calculate: ToolDefinition = {
  name: "calculate",
  description:
    "Evaluate a mathematical expression. Supports basic arithmetic, percentages, and common math operations.",
  inputSchema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description:
          'Math expression to evaluate (e.g. "100 * 1.05 ** 12" or "(50000 * 0.05) / 365")',
      },
    },
    required: ["expression"],
  },
  async execute(input) {
    const expr = String(input.expression);
    // Only allow safe math characters
    if (!/^[\d\s+\-*/().%^e,]+$/i.test(expr)) {
      return "Error: expression contains invalid characters. Only numbers and math operators allowed.";
    }
    try {
      // Replace ^ with ** for exponentiation
      const sanitized = expr.replace(/\^/g, "**");
      const result = new Function(`"use strict"; return (${sanitized})`)();
      if (typeof result !== "number" || !isFinite(result)) {
        return "Error: expression did not evaluate to a finite number.";
      }
      return `${expr} = ${result}`;
    } catch (err) {
      return `Calculation error: ${err instanceof Error ? err.message : "Invalid expression"}`;
    }
  },
};

// --- ask_agent (factory — created per-request with closures) ---

export interface AskAgentDeps {
  getAgent: (
    agentId: string
  ) => Promise<{ name: string; config: import("../types").AgentConfig } | null>;
  runChat: (
    config: import("../types").AgentConfig,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    message: string
  ) => Promise<{ response: string; toolsUsed: string[] }>;
  onEvent: (event: { type: string; [key: string]: unknown }) => void;
  callDepth: number;
  maxDepth: number;
  callerAgentId: string;
}

export function createAskAgentTool(deps: AskAgentDeps): ToolDefinition {
  return {
    name: "ask_agent",
    description:
      "Ask another AI agent a question. The agent will process your request and return a response. Use this to delegate specialized tasks to other agents.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: {
          type: "string",
          description: "The ID (slug) of the agent to ask",
        },
        message: {
          type: "string",
          description: "The message/question to send to the agent",
        },
      },
      required: ["agentId", "message"],
    },
    async execute(input) {
      const agentId = String(input.agentId);
      const message = String(input.message);

      if (agentId === deps.callerAgentId) {
        return "Error: An agent cannot call itself.";
      }

      if (deps.callDepth >= deps.maxDepth) {
        return "Error: Maximum agent call depth reached. Cannot make further nested agent calls.";
      }

      const target = await deps.getAgent(agentId);
      if (!target) {
        return `Error: Agent "${agentId}" not found.`;
      }

      deps.onEvent({
        type: "agent_call",
        agentId,
        agentName: target.name,
      });

      try {
        const result = await deps.runChat(target.config, [], message);
        deps.onEvent({
          type: "agent_result",
          agentId,
          response: result.response,
        });
        return result.response;
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Agent call failed";
        deps.onEvent({
          type: "agent_result",
          agentId,
          response: `Error: ${errMsg}`,
        });
        return `Error calling agent "${agentId}": ${errMsg}`;
      }
    },
  };
}

// --- Registry ---

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  get_crypto_price: getCryptoPrice,
  get_solana_token_info: getSolanaTokenInfo,
  web_search: webSearch,
  fetch_url: fetchUrl,
  calculate,
};

export function getToolsForAgent(enabledTools: string[]): ToolDefinition[] {
  return enabledTools
    .map((name) => TOOL_REGISTRY[name])
    .filter(Boolean);
}

export function listAvailableTools(): Array<{
  name: string;
  description: string;
}> {
  const tools = Object.values(TOOL_REGISTRY).map((t) => ({
    name: t.name,
    description: t.description,
  }));
  tools.push({
    name: "ask_agent",
    description:
      "Ask another AI agent a question. Delegates specialized tasks to other agents in the platform.",
  });
  return tools;
}
