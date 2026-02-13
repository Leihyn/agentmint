# AgentMint

Create AI agents, launch them as Solana tokens, and earn from every trade.

AgentMint turns AI agents into tradeable on-chain assets. Describe an agent in plain English, Claude builds its brain, the Bags protocol mints its token, and every trade generates fees that flow back to the creator.

## Quick Start

```bash
# Clone
git clone https://github.com/Leihyn/agentmint.git
cd agentmint

# Backend
cd backend
cp .env.example .env
# Add your ANTHROPIC_API_KEY and BAGS_API_KEY to .env
npm install
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Backend runs on `http://localhost:3001`, frontend on `http://localhost:3000`.

## How It Works

1. **Describe** — Tell AgentMint what your agent should do. Pick a template (trading signals, code review, research, content) or write a freeform description. Claude generates the full agent config: system prompt, personality, tools, and behavior.

2. **Test** — Chat with your agent in a live preview before committing. It has real tools: crypto prices, Solana token info, web search, math, and cross-agent calls.

3. **Launch** — One click mints a Solana token for the agent via the Bags API. Fee-sharing is configured automatically (80% creator, 20% platform).

4. **Earn** — Every trade on the agent's token generates fees. Creators claim earnings directly through the app.

5. **Fork** — See a great agent? Fork it. The original creator automatically gets 10% of the fork's trading fees (70/10/20 split). Popular agents compound revenue across every fork.

## Architecture

Single Express.js backend + Next.js frontend. Claude Sonnet 4.5 powers agent generation and chat. Bags API handles all on-chain operations (token creation, fee-share configuration, launch transactions, claims).

```
Frontend (Next.js)  →  Backend (Express)  →  Claude API (agent brain)
                                           →  Bags API (token + fees)
                                           →  Solana (blockchain)
```

**Key design decisions:**
- **Platform adapter pattern** for tools — agents compose capabilities (prices, search, math, cross-agent calls) without knowing the implementation
- **SSE streaming** for real-time chat responses with tool-use visualization
- **Basis points (bps)** for fee splits — same system Bags uses, scales to 100 claimers
- **Agent-to-agent communication** — agents can ask other agents mid-conversation (depth-limited to 2 levels)

## Agent Tools

| Tool | What it does |
|------|-------------|
| `get_crypto_price` | Live prices from CoinGecko (BTC, ETH, SOL, etc.) |
| `get_solana_token_info` | Token stats via Bags API (price, mcap, holders, lifetime fees) |
| `web_search` | DuckDuckGo search (top 5 results) |
| `fetch_url` | Extract text from web pages |
| `calculate` | Safe math expression evaluator |
| `ask_agent` | Call another agent mid-conversation |

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List launched agents |
| `/api/agents/all` | GET | List all agents (draft + launched) |
| `/api/agents` | POST | Create new agent |
| `/api/agents/generate` | POST | AI-generate agent config from description |
| `/api/agents/:id/chat` | POST | SSE streaming chat |
| `/api/agents/:id/fork` | POST | Fork an agent (auto 70/10/20 split) |
| `/api/agents/:id/launch/prepare` | POST | Mint token + configure fee share |
| `/api/agents/:id/launch/transaction` | POST | Get launch transaction to sign |
| `/api/agents/:id/launch/confirm` | POST | Record launch in DB |
| `/api/agents/:id/stats` | GET | Token stats (price, mcap, holders, fees) |
| `/api/claims/:wallet` | GET | Claimable positions for wallet |
| `/api/claims/:wallet/create` | POST | Generate claim transaction |

## Tech Stack

- **Frontend**: Next.js 14, React Query, TailwindCSS, Solana Wallet Adapter (Phantom)
- **Backend**: Express.js, TypeScript
- **AI**: Claude Sonnet 4.5 (`@anthropic-ai/sdk`)
- **Blockchain**: Solana, Bags SDK (`@bagsfm/bags-sdk`)
- **Database**: JSON file persistence (prototype)

## Environment Variables

**Backend** (`backend/.env`):
```
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
BAGS_API_KEY=...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## License

MIT
