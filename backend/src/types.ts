// --- Agent Config (stored as JSON in db) ---

export interface AgentConfig {
  systemPrompt: string;
  personality: "analytical" | "friendly" | "creative" | "scholarly";
  enabledTools: string[];
  temperature: number;
  maxTurns: number;
  greeting: string;
  examplePrompts: string[];
}

// --- API Request/Response Types ---

export interface CreateAgentRequest {
  name: string;
  description: string;
  config: AgentConfig;
  templateId?: string;
  imageUrl?: string;
  tokenName?: string;
  tokenSymbol?: string;
  creatorWallet: string;
  teamMembers?: Array<{
    wallet: string;
    role: string;
    bps: number;
    label: string;
  }>;
  forkedFrom?: string;
}

export interface GenerateAgentRequest {
  description: string;
  templateId?: string;
}

export interface GenerateAgentResponse {
  config: AgentConfig;
  suggestedName: string;
  suggestedSymbol: string;
  suggestedDescription: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  userWallet?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  toolsUsed: string[];
}

// --- Launch Types (reused from bags integration) ---

export interface LaunchPrepareRequest {
  agentId: string;
  metadata: {
    name: string;
    symbol: string;
    description: string;
    imageUrl?: string;
  };
  claimers: Array<{ wallet: string; bps: number }>;
}

export interface LaunchTransactionRequest {
  mint: string;
  metadataUri: string;
  feeShareConfigKey: string;
  launcherWallet: string;
}

export interface LaunchConfirmRequest {
  agentId: string;
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  metadataUri: string;
  feeShareConfigKey: string;
  launchSignature: string;
}

// --- Agent Record (API response shape) ---

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
