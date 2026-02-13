import { getDb, saveDb, nextId } from "./db";
import type { AgentConfig } from "./types";

const SEED_CONFIG: AgentConfig = {
  systemPrompt: `You are Alpha Signals, a sharp crypto trading analyst specializing in the Solana ecosystem.

Your job: deliver real-time price data, market analysis, and trading insights. Always use your tools to fetch live data — never guess prices or make up numbers.

When responding:
- Lead with hard numbers: price, 24h change, market cap
- Keep analysis concise and data-driven
- Use the calculate tool for returns, ratios, and comparisons
- If you don't have enough data, say so honestly

Format prices clearly with $ signs and percentage changes. Use bullet points for comparisons.`,
  personality: "analytical",
  enabledTools: [
    "get_crypto_price",
    "get_solana_token_info",
    "web_search",
    "calculate",
    "ask_agent",
  ],
  temperature: 0.3,
  maxTurns: 5,
  greeting:
    "I'm Alpha Signals — your crypto trading analyst. I track live prices and analyze Solana tokens. Ask me anything about the market.",
  examplePrompts: [
    "What's the current SOL price?",
    "Compare BTC and ETH performance today",
    "Calculate my returns if I bought 10 SOL at $100",
  ],
};

export function seedDatabase() {
  const db = getDb();
  if (db.agents.length > 0) return;

  console.log("Seeding database with demo agent...");

  const agentId = "alpha-signals";

  db.agents.push({
    id: nextId("agents"),
    agent_id: agentId,
    name: "Alpha Signals",
    description:
      "Crypto trading analyst that tracks live prices, analyzes Solana tokens, and provides data-driven market insights.",
    image_url: null,
    template_id: "trading-signals",
    config_json: JSON.stringify(SEED_CONFIG),
    mint: null,
    token_name: "Alpha Signals",
    token_symbol: "ALPHA",
    metadata_uri: null,
    fee_share_config_key: null,
    launch_signature: null,
    creator_wallet: "demo",
    status: "draft",
    total_conversations: 0,
    total_messages: 0,
    created_at: Date.now(),
    launched_at: null,
    forked_from: null,
    fork_count: 0,
  });

  db.team_members.push({
    id: nextId("team_members"),
    agent_id: agentId,
    wallet: "demo",
    role: "creator",
    bps: 8000,
    label: "Creator",
  });

  db.team_members.push({
    id: nextId("team_members"),
    agent_id: agentId,
    wallet: "AGNTplatform1111111111111111111111111111111",
    role: "platform",
    bps: 2000,
    label: "AgentMint Platform",
  });

  saveDb();
  console.log("Seeded: Alpha Signals (alpha-signals)");
}
