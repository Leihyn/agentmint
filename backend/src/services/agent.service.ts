import { getDb, saveDb, nextId } from "../db";
import type { DbAgent, DbTeamMember } from "../db/schema";
import type { AgentConfig, CreateAgentRequest, AgentRecord } from "../types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function ensureUniqueSlug(base: string): string {
  const db = getDb();
  let slug = base;
  let counter = 1;
  while (db.agents.some((a) => a.agent_id === slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

function dbAgentToRecord(
  agent: DbAgent,
  teamMembers?: DbTeamMember[]
): AgentRecord {
  return {
    id: agent.id,
    agentId: agent.agent_id,
    name: agent.name,
    description: agent.description,
    imageUrl: agent.image_url,
    templateId: agent.template_id,
    config: JSON.parse(agent.config_json) as AgentConfig,
    mint: agent.mint,
    tokenName: agent.token_name,
    tokenSymbol: agent.token_symbol,
    creatorWallet: agent.creator_wallet,
    status: agent.status,
    totalConversations: agent.total_conversations,
    totalMessages: agent.total_messages,
    createdAt: agent.created_at,
    launchedAt: agent.launched_at,
    forkedFrom: agent.forked_from ?? null,
    forkCount: agent.fork_count ?? 0,
    teamMembers: teamMembers?.map((tm) => ({
      wallet: tm.wallet,
      role: tm.role,
      bps: tm.bps,
      label: tm.label,
    })),
  };
}

export function createAgent(req: CreateAgentRequest): AgentRecord {
  const db = getDb();
  const agentId = ensureUniqueSlug(slugify(req.name));

  const agent: DbAgent = {
    id: nextId("agents"),
    agent_id: agentId,
    name: req.name,
    description: req.description,
    image_url: req.imageUrl || null,
    template_id: req.templateId || null,
    config_json: JSON.stringify(req.config),
    mint: null,
    token_name: req.tokenName || null,
    token_symbol: req.tokenSymbol || null,
    metadata_uri: null,
    fee_share_config_key: null,
    launch_signature: null,
    creator_wallet: req.creatorWallet,
    status: "draft",
    total_conversations: 0,
    total_messages: 0,
    created_at: Date.now(),
    launched_at: null,
    forked_from: req.forkedFrom || null,
    fork_count: 0,
  };

  db.agents.push(agent);

  // Increment parent fork count
  if (req.forkedFrom) {
    const parent = db.agents.find((a) => a.agent_id === req.forkedFrom);
    if (parent) {
      parent.fork_count = (parent.fork_count ?? 0) + 1;
    }
  }

  // Save team members
  const teamMembers: DbTeamMember[] = [];
  if (req.teamMembers && req.teamMembers.length > 0) {
    for (const tm of req.teamMembers) {
      const member: DbTeamMember = {
        id: nextId("team_members"),
        agent_id: agentId,
        wallet: tm.wallet,
        role: tm.role,
        bps: tm.bps,
        label: tm.label,
      };
      db.team_members.push(member);
      teamMembers.push(member);
    }
  }

  saveDb();
  return dbAgentToRecord(agent, teamMembers);
}

export function getAgent(agentId: string): AgentRecord | null {
  const db = getDb();
  const agent = db.agents.find((a) => a.agent_id === agentId);
  if (!agent) return null;
  const teamMembers = db.team_members.filter(
    (tm) => tm.agent_id === agentId
  );
  return dbAgentToRecord(agent, teamMembers);
}

export function listAgents(statusFilter?: "draft" | "launched"): AgentRecord[] {
  const db = getDb();
  let agents = db.agents;
  if (statusFilter) {
    agents = agents.filter((a) => a.status === statusFilter);
  }
  return agents.map((a) => {
    const teamMembers = db.team_members.filter(
      (tm) => tm.agent_id === a.agent_id
    );
    return dbAgentToRecord(a, teamMembers);
  });
}

export function listAgentsByWallet(wallet: string): AgentRecord[] {
  const db = getDb();
  const agents = db.agents.filter((a) => a.creator_wallet === wallet);
  return agents.map((a) => {
    const teamMembers = db.team_members.filter(
      (tm) => tm.agent_id === a.agent_id
    );
    return dbAgentToRecord(a, teamMembers);
  });
}

export function updateAgentLaunch(
  agentId: string,
  data: {
    mint: string;
    tokenName: string;
    tokenSymbol: string;
    metadataUri: string;
    feeShareConfigKey: string;
    launchSignature: string;
  }
): AgentRecord | null {
  const db = getDb();
  const agent = db.agents.find((a) => a.agent_id === agentId);
  if (!agent) return null;

  agent.mint = data.mint;
  agent.token_name = data.tokenName;
  agent.token_symbol = data.tokenSymbol;
  agent.metadata_uri = data.metadataUri;
  agent.fee_share_config_key = data.feeShareConfigKey;
  agent.launch_signature = data.launchSignature;
  agent.status = "launched";
  agent.launched_at = Date.now();

  saveDb();

  const teamMembers = db.team_members.filter(
    (tm) => tm.agent_id === agentId
  );
  return dbAgentToRecord(agent, teamMembers);
}

export function forkAgent(
  parentAgentId: string,
  creatorWallet: string,
  overrides?: { name?: string; tokenSymbol?: string }
): AgentRecord | null {
  const parent = getAgent(parentAgentId);
  if (!parent) return null;

  const name = overrides?.name || `${parent.name} Fork`;
  const symbol = overrides?.tokenSymbol || parent.tokenSymbol || "FORK";

  // Build team: 70% creator, 10% original creator, 20% platform
  const teamMembers: Array<{
    wallet: string;
    role: string;
    bps: number;
    label: string;
  }> = [
    { wallet: creatorWallet, role: "creator", bps: 7000, label: "Creator" },
    {
      wallet: parent.creatorWallet,
      role: "original_creator",
      bps: 1000,
      label: `Original Creator (${parent.name})`,
    },
    {
      wallet: "AGNTplatform1111111111111111111111111111111",
      role: "platform",
      bps: 2000,
      label: "AgentMint Platform",
    },
  ];

  return createAgent({
    name,
    description: parent.description,
    config: parent.config,
    templateId: parent.templateId || undefined,
    tokenName: name,
    tokenSymbol: symbol,
    creatorWallet,
    teamMembers,
    forkedFrom: parentAgentId,
  });
}

export function getAgentForks(agentId: string): AgentRecord[] {
  const db = getDb();
  const forks = db.agents.filter((a) => a.forked_from === agentId);
  return forks.map((a) => {
    const teamMembers = db.team_members.filter(
      (tm) => tm.agent_id === a.agent_id
    );
    return dbAgentToRecord(a, teamMembers);
  });
}

export function incrementAgentStats(
  agentId: string,
  conversations: number,
  messages: number
) {
  const db = getDb();
  const agent = db.agents.find((a) => a.agent_id === agentId);
  if (!agent) return;
  agent.total_conversations += conversations;
  agent.total_messages += messages;
  saveDb();
}
