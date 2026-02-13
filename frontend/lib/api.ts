const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

// --- Types ---

export interface AgentConfig {
  systemPrompt: string;
  personality: "analytical" | "friendly" | "creative" | "scholarly";
  enabledTools: string[];
  temperature: number;
  maxTurns: number;
  greeting: string;
  examplePrompts: string[];
}

export interface AgentRecord {
  id: number;
  agentId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  templateId: string | null;
  config: AgentConfig;
  mint: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  creatorWallet: string;
  status: "draft" | "launched" | "paused";
  totalConversations: number;
  totalMessages: number;
  createdAt: number;
  launchedAt: number | null;
  teamMembers?: Array<{
    wallet: string;
    role: string;
    bps: number;
    label: string;
  }>;
  forkedFrom: string | null;
  forkCount: number;
}

export interface AgentTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultConfig: Partial<AgentConfig>;
}

export interface GenerateAgentResponse {
  config: AgentConfig;
  suggestedName: string;
  suggestedSymbol: string;
  suggestedDescription: string;
}

export interface TokenStats {
  lifetimeFees: number;
  holders: number;
  marketCap: number;
  price: number;
}

export interface TeamMember {
  wallet: string;
  role: string;
  bps: number;
  label: string;
}

// --- SSE Stream Event ---

export type ChatStreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string }
  | { type: "tool_result"; name: string }
  | { type: "agent_call"; agentId: string; agentName: string }
  | { type: "agent_result"; agentId: string; response: string }
  | { type: "done"; conversationId: string; toolsUsed: string[] }
  | { type: "error"; message: string };

// --- SSE Stream Helper ---

export async function readSSEStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6)) as ChatStreamEvent;
            onEvent(event);
          } catch {
            // Skip malformed events
          }
        }
      }
    }
  }
}

// --- API Functions ---

export function listTemplates() {
  return request<AgentTemplate[]>("/api/templates");
}

export function listAgents() {
  return request<AgentRecord[]>("/api/agents");
}

export function listAllAgents() {
  return request<AgentRecord[]>("/api/agents/all");
}

export function getAgent(agentId: string) {
  return request<AgentRecord>(`/api/agents/${agentId}`);
}

export function getMyAgents(wallet: string) {
  return request<AgentRecord[]>(`/api/agents/mine/${wallet}`);
}

export function createAgent(data: {
  name: string;
  description: string;
  config: AgentConfig;
  templateId?: string;
  imageUrl?: string;
  tokenName?: string;
  tokenSymbol?: string;
  creatorWallet: string;
  teamMembers?: TeamMember[];
  forkedFrom?: string;
}) {
  return request<AgentRecord>("/api/agents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function forkAgent(
  agentId: string,
  data: { creatorWallet: string; name?: string; tokenSymbol?: string }
) {
  return request<AgentRecord>(`/api/agents/${agentId}/fork`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAgentForks(agentId: string) {
  return request<AgentRecord[]>(`/api/agents/${agentId}/forks`);
}

export function generateAgent(description: string, templateId?: string) {
  return request<GenerateAgentResponse>("/api/agents/generate", {
    method: "POST",
    body: JSON.stringify({ description, templateId }),
  });
}

// --- Streaming Chat ---

export async function chatWithAgentStream(
  agentId: string,
  message: string,
  onEvent: (event: ChatStreamEvent) => void,
  conversationId?: string,
  userWallet?: string
) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversationId, userWallet }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Chat error: ${res.status}`);
  }

  await readSSEStream(res, onEvent);
}

// --- Streaming Live Greeting ---

export async function fetchLiveGreeting(
  agentId: string,
  onEvent: (event: ChatStreamEvent) => void
) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/greeting`);

  if (!res.ok) {
    throw new Error("Failed to fetch live greeting");
  }

  await readSSEStream(res, onEvent);
}

// --- Streaming Preview Chat ---

export async function previewChatStream(
  config: AgentConfig,
  message: string,
  onEvent: (event: ChatStreamEvent) => void
) {
  const res = await fetch(`${API_URL}/api/agents/preview-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, message }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Preview chat error: ${res.status}`);
  }

  await readSSEStream(res, onEvent);
}

// --- Non-streaming API calls ---

export function launchPrepare(
  agentId: string,
  data: {
    metadata: {
      name: string;
      symbol: string;
      description: string;
      imageUrl?: string;
    };
    claimers: Array<{ wallet: string; bps: number }>;
  }
) {
  return request<{
    mint: string;
    metadataUri: string;
    feeShareConfigKey: string;
  }>(`/api/agents/${agentId}/launch/prepare`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function launchTransaction(
  agentId: string,
  data: {
    mint: string;
    metadataUri: string;
    feeShareConfigKey: string;
    launcherWallet: string;
  }
) {
  return request<{ serializedTx: string }>(
    `/api/agents/${agentId}/launch/transaction`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function launchConfirm(
  agentId: string,
  data: {
    mint: string;
    tokenName: string;
    tokenSymbol: string;
    metadataUri: string;
    feeShareConfigKey: string;
    launchSignature: string;
  }
) {
  return request<AgentRecord>(`/api/agents/${agentId}/launch/confirm`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAgentStats(agentId: string) {
  return request<TokenStats>(`/api/agents/${agentId}/stats`);
}

export function getClaimablePositions(wallet: string) {
  return request<{
    positions: Array<{
      mint: string;
      claimableAmount: number;
      totalEarned: number;
      bps: number;
    }>;
  }>(`/api/claims/${wallet}`);
}

export function createClaimTx(wallet: string, mint: string) {
  return request<{ serializedTx: string }>(`/api/claims/${wallet}/create`, {
    method: "POST",
    body: JSON.stringify({ mint }),
  });
}
