# AgentMint Demo Video Script

Recording time: ~3-4 minutes. Screen record with voice-over.

## Before Recording

- Backend running: `cd backend && npm run dev` (port 3001)
- Frontend running: `cd frontend && npm run dev` (port 3000)
- Phantom wallet extension installed and connected
- Browser open to `localhost:3000`
- Clear any previous test data (delete `backend/agentmint.json` and restart)

---

## The Hook (15 seconds)

**[Screen: Homepage hero — "Mint AI Agents That Earn"]**

> "AI agents are everywhere. But right now, if you build a useful agent, there's no way to monetize it on-chain. Token launches exist. AI agents exist. Nobody's connected them — until now."

---

## Scene 1: Create an Agent (60 seconds)

**[Do: Click "Create an Agent"]**

> "AgentMint lets anyone create an AI agent and launch it as a Solana token — in under a minute. No coding required."

**[Do: Click the "Trading Signals" template]**

> "Pick a template — or describe your agent from scratch. I'll use the Trading Signals template."

**[Do: Type in the description field: "A crypto trading analyst that specializes in Solana memecoins. It should track live prices, analyze token metrics from Bags, and give data-driven buy/sell opinions."]**

> "Just describe what you want the agent to do. Plain English."

**[Do: Click "Generate" — wait for Claude to return the config]**

> "Claude builds the entire agent — system prompt, personality, tools, temperature. You can fine-tune anything, but the defaults are production-ready."

**[Do: Briefly scroll through the generated config — show the system prompt, enabled tools, example prompts]**

> "It's picked the right tools automatically: crypto prices, Solana token info from the Bags API, web search, and even cross-agent communication."

---

## Scene 2: Test the Agent (45 seconds)

**[Do: Click "Test Agent" or the preview chat area]**

> "Before launching, you can test the agent in a live preview."

**[Do: Type "What's the current SOL price and how's the market looking?"]**

This is the money shot. Wait for the streaming response.

**[Do: Watch the response stream in — tool calls will show as badges (e.g., "Using get_crypto_price...")]**

> "Watch — the agent is calling real tools. That green badge means it's fetching live crypto prices right now. Not a canned response. Real data, real-time."

**[Do: Let the full response render — should show SOL price, 24h change, brief analysis]**

> "Live prices, percentage changes, market analysis. This agent is ready."

---

## Scene 3: Launch the Token (45 seconds)

**[Do: Click "Create Agent" to save it, then navigate to the Launch page]**

> "Now the magic — launching a token for this agent on Solana, powered by the Bags protocol."

**[Do: Show the token name, symbol, and team split editor (80% creator / 20% platform)]**

> "Every agent gets a token. The fee-sharing is configured automatically through the Bags API — 80% to you as the creator, 20% to the platform. Every single trade on this token generates fees that flow to these addresses."

**[Do: Click "Launch" — show Phantom wallet popup, sign the transaction]**

> "One click. Sign with your wallet. The Bags API handles token creation, fee-share configuration, and the launch transaction."

**[Do: Show the confirmation — "Launched!" with the mint address and token stats]**

> "Done. Your AI agent now has a live Solana token."

---

## Scene 4: Agent Forking (30 seconds)

**[Do: Navigate to the agent detail page. Click "Fork" button.]**

> "Here's what makes this a platform, not just a tool. Anyone can fork your agent."

**[Do: Show the fork creation with the auto 70/10/20 split]**

> "When someone forks your agent, the revenue split changes automatically: 70% to the new creator, 10% back to you — the original builder — and 20% to the platform. All configured on-chain through Bags fee-share."

> "Build one great agent, and every fork earns you passive income. Forever."

---

## Scene 5: Multi-Agent Pipelines (30 seconds)

**[Do: Chat with an agent. Type: "Ask the alpha-signals agent to analyze SOL"]**

> "Agents can call other agents mid-conversation. Watch — this agent is now asking Alpha Signals for data."

**[Do: Show the purple "Asking Alpha Signals..." badge appear, then resolve]**

> "Composable AI on Solana. Specialized agents become building blocks. Every sub-agent call creates demand for that agent's token."

---

## The Close (15 seconds)

**[Screen: Homepage or agent marketplace view]**

> "AgentMint. Describe an agent. Launch a token. Earn from every trade. Built on the Bags protocol."

**[Do: Show the GitHub URL briefly]**

> "Open source. github.com/Leihyn/agentmint"

---

## If Things Go Wrong

**Agent response cuts off mid-stream:**
The max_tokens was bumped to 4096. If it still cuts off, it's a very long response — the agent is still functional, just truncated. Move on.

**Phantom wallet doesn't connect:**
Refresh the page. If still stuck, click the wallet icon in the navbar manually.

**Backend 500 error:**
Check the terminal running the backend. Most likely the Anthropic API key needs refreshing. Restart the backend.

**Tool call takes too long:**
CoinGecko or DuckDuckGo might be slow. Wait it out — the streaming UI will show the tool badges. If it times out, try a simpler prompt like "What's the BTC price?"

**Chat says "Agent not found":**
The seed data didn't load. Restart the backend (it auto-seeds on startup).
