import express from "express";
import cors from "cors";
import { config, validateConfig } from "./config";
import * as bags from "./services/bags.service";
import * as agentService from "./services/agent.service";
import * as chatService from "./services/chat.service";
import {
  generateAgentConfig,
  runAgentChatStreaming,
  generateLiveGreeting,
  type ChatStreamEvent,
} from "./llm/agent-runtime";
import { listAvailableTools } from "./llm/tools";
import { TEMPLATES } from "./templates";
import { seedDatabase } from "./seed";
import type {
  CreateAgentRequest,
  GenerateAgentRequest,
  ChatRequest,
  AgentConfig,
  LaunchPrepareRequest,
  LaunchTransactionRequest,
  LaunchConfirmRequest,
} from "./types";

validateConfig();
seedDatabase();

const app = express();
app.use(cors());
app.use(express.json());

// JSON parse error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (
      (err as unknown as Record<string, unknown>).type === "entity.parse.failed"
    ) {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
    next(err);
  }
);

// --- SSE helper ---
function setupSSE(res: express.Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

function sendSSE(res: express.Response, event: ChatStreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// --- Health ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// --- Templates ---
app.get("/api/templates", (_req, res) => {
  res.json(
    TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      description: t.description,
      defaultConfig: t.defaultConfig,
    }))
  );
});

// --- Tools ---
app.get("/api/tools", (_req, res) => {
  res.json(listAvailableTools());
});

// --- Agent CRUD ---

app.get("/api/agents", (_req, res) => {
  try {
    const agents = agentService.listAgents("launched");
    res.json(agents);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "List failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/agents/all", (_req, res) => {
  try {
    const agents = agentService.listAgents();
    res.json(agents);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "List failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/agents/mine/:wallet", (req, res) => {
  try {
    const agents = agentService.listAgentsByWallet(req.params.wallet);
    res.json(agents);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "List failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/agents/:agentId", (req, res) => {
  try {
    const agent = agentService.getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(agent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    res.status(500).json({ error: message });
  }
});

app.post("/api/agents", (req, res) => {
  try {
    const data = req.body as CreateAgentRequest;
    if (!data.name || !data.config || !data.creatorWallet) {
      res
        .status(400)
        .json({ error: "name, config, and creatorWallet required" });
      return;
    }
    const agent = agentService.createAgent(data);
    res.json(agent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Create failed";
    console.error("Agent create error:", message);
    res.status(500).json({ error: message });
  }
});

// --- Forking ---

app.post("/api/agents/:agentId/fork", (req, res) => {
  try {
    const { creatorWallet, name, tokenSymbol } = req.body as {
      creatorWallet: string;
      name?: string;
      tokenSymbol?: string;
    };
    if (!creatorWallet) {
      res.status(400).json({ error: "creatorWallet required" });
      return;
    }
    const forked = agentService.forkAgent(req.params.agentId, creatorWallet, {
      name,
      tokenSymbol,
    });
    if (!forked) {
      res.status(404).json({ error: "Parent agent not found" });
      return;
    }
    res.json(forked);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fork failed";
    console.error("Fork error:", message);
    res.status(500).json({ error: message });
  }
});

app.get("/api/agents/:agentId/forks", (req, res) => {
  try {
    const forks = agentService.getAgentForks(req.params.agentId);
    res.json(forks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "List forks failed";
    res.status(500).json({ error: message });
  }
});

// --- AI Generation ---

app.post("/api/agents/generate", async (req, res) => {
  try {
    const { description, templateId } = req.body as GenerateAgentRequest;
    if (!description) {
      res.status(400).json({ error: "description required" });
      return;
    }
    const result = await generateAgentConfig(description, templateId);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("Agent generate error:", message);
    res.status(500).json({ error: message });
  }
});

// --- Chat (SSE streaming) ---

app.post("/api/agents/:agentId/chat", async (req, res) => {
  try {
    const agent = agentService.getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const { message, conversationId, userWallet } = req.body as ChatRequest;
    if (!message) {
      res.status(400).json({ error: "message required" });
      return;
    }

    // Set up SSE
    setupSSE(res);

    // Get or create conversation
    const conv = chatService.getOrCreateConversation(
      conversationId,
      agent.agentId,
      userWallet || null
    );

    // Save user message
    chatService.addMessage(conv.conversation_id, "user", message);

    // Get conversation history (exclude the message we just added)
    const history = chatService.getMessages(conv.conversation_id);
    const priorHistory = history.slice(0, -1);

    // Run streaming agent
    const agentLookup = async (id: string) => {
      const target = agentService.getAgent(id);
      if (!target) return null;
      return { name: target.name, config: target.config };
    };

    const { fullResponse, toolsUsed } = await runAgentChatStreaming(
      agent.config,
      priorHistory,
      message,
      (event) => sendSSE(res, event),
      {
        callerAgentId: agent.agentId,
        agentLookup,
      }
    );

    // Save assistant message
    chatService.addMessage(conv.conversation_id, "assistant", fullResponse);

    // Update agent stats
    const isNewConversation = !conversationId;
    agentService.incrementAgentStats(
      agent.agentId,
      isNewConversation ? 1 : 0,
      2
    );

    // Send done event
    sendSSE(res, {
      type: "done",
      conversationId: conv.conversation_id,
      toolsUsed,
    });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Chat failed";
    console.error("Chat error:", message);
    // If headers already sent (streaming started), send error as SSE
    if (res.headersSent) {
      sendSSE(res, { type: "error", message });
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// --- Live Greeting (SSE streaming) ---

app.get("/api/agents/:agentId/greeting", async (req, res) => {
  try {
    const agent = agentService.getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    setupSSE(res);

    const { toolsUsed } = await generateLiveGreeting(
      agent.config,
      (event) => sendSSE(res, event)
    );

    sendSSE(res, {
      type: "done",
      conversationId: "",
      toolsUsed,
    });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Greeting failed";
    console.error("Greeting error:", message);
    if (res.headersSent) {
      sendSSE(res, { type: "error", message });
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// --- Preview Chat (SSE streaming, no persistence) ---

app.post("/api/agents/preview-chat", async (req, res) => {
  try {
    const { config: agentConfig, message } = req.body as {
      config: AgentConfig;
      message: string;
    };
    if (!agentConfig || !message) {
      res.status(400).json({ error: "config and message required" });
      return;
    }

    setupSSE(res);

    const { toolsUsed } = await runAgentChatStreaming(
      agentConfig,
      [],
      message,
      (event) => sendSSE(res, event)
    );

    sendSSE(res, {
      type: "done",
      conversationId: "",
      toolsUsed,
    });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Preview chat failed";
    console.error("Preview chat error:", message);
    if (res.headersSent) {
      sendSSE(res, { type: "error", message });
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// --- Launch (reuses bags.service.ts) ---

app.post("/api/agents/:agentId/launch/prepare", async (req, res) => {
  try {
    const agent = agentService.getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const data = req.body as LaunchPrepareRequest;
    if (
      !data.metadata?.name ||
      !data.metadata?.symbol ||
      !data.claimers?.length
    ) {
      res.status(400).json({
        error: "metadata (name, symbol) and at least one claimer required",
      });
      return;
    }

    const { mint, metadataUri } = await bags.createTokenInfo({
      name: data.metadata.name,
      symbol: data.metadata.symbol,
      description: data.metadata.description,
      imageUrl: data.metadata.imageUrl,
      creatorWallet: data.claimers[0]?.wallet || "",
    });

    const { configKey } = await bags.configureFeeShare({
      mint,
      claimers: data.claimers.map((c) => ({
        wallet: c.wallet,
        bps: c.bps,
      })),
    });

    res.json({ mint, metadataUri, feeShareConfigKey: configKey });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Prepare failed";
    console.error("Launch prepare error:", message);
    res.status(500).json({ error: message });
  }
});

app.post("/api/agents/:agentId/launch/transaction", async (req, res) => {
  try {
    const data = req.body as LaunchTransactionRequest;
    const { serializedTx } = await bags.createLaunchTransaction({
      mint: data.mint,
      metadataUri: data.metadataUri,
      feeShareConfigKey: data.feeShareConfigKey,
      launcherWallet: data.launcherWallet,
    });
    res.json({ serializedTx });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Transaction creation failed";
    console.error("Launch transaction error:", message);
    res.status(500).json({ error: message });
  }
});

app.post("/api/agents/:agentId/launch/confirm", (req, res) => {
  try {
    const data = req.body as LaunchConfirmRequest;
    const agent = agentService.updateAgentLaunch(req.params.agentId, {
      mint: data.mint,
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      metadataUri: data.metadataUri,
      feeShareConfigKey: data.feeShareConfigKey,
      launchSignature: data.launchSignature,
    });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    res.json(agent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Confirm failed";
    console.error("Launch confirm error:", message);
    res.status(500).json({ error: message });
  }
});

// --- Stats & Claims ---

app.get("/api/agents/:agentId/stats", async (req, res) => {
  try {
    const agent = agentService.getAgent(req.params.agentId);
    if (!agent || !agent.mint) {
      res.status(404).json({ error: "Agent or token not found" });
      return;
    }
    const stats = await bags.getTokenStats(agent.mint);
    res.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stats fetch failed";
    console.error("Token stats error:", message);
    res.status(500).json({ error: message });
  }
});

app.get("/api/claims/:wallet", async (req, res) => {
  try {
    const positions = await bags.getClaimablePositions(req.params.wallet);
    res.json({ positions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Claims fetch failed";
    console.error("Claims error:", message);
    res.status(500).json({ error: message });
  }
});

app.post("/api/claims/:wallet/create", async (req, res) => {
  try {
    const { mint } = req.body;
    if (!mint) {
      res.status(400).json({ error: "mint required" });
      return;
    }
    const { serializedTx } = await bags.createClaimTransaction(
      req.params.wallet,
      mint
    );
    res.json({ serializedTx });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Claim creation failed";
    console.error("Claim create error:", message);
    res.status(500).json({ error: message });
  }
});

app.listen(config.port, () => {
  console.log(`AgentMint API running on http://localhost:${config.port}`);
});
