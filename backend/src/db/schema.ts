export interface DbSchema {
  agents: DbAgent[];
  team_members: DbTeamMember[];
  conversations: DbConversation[];
  messages: DbMessage[];
  _nextId: {
    agents: number;
    team_members: number;
    conversations: number;
    messages: number;
  };
}

export interface DbAgent {
  id: number;
  agent_id: string;
  name: string;
  description: string;
  image_url: string | null;
  template_id: string | null;
  config_json: string;

  // Token (null until launched)
  mint: string | null;
  token_name: string | null;
  token_symbol: string | null;
  metadata_uri: string | null;
  fee_share_config_key: string | null;
  launch_signature: string | null;

  creator_wallet: string;
  status: "draft" | "launched" | "paused";
  total_conversations: number;
  total_messages: number;
  created_at: number;
  launched_at: number | null;

  // Forking
  forked_from: string | null;
  fork_count: number;
}

export interface DbTeamMember {
  id: number;
  agent_id: string;
  wallet: string;
  role: string;
  bps: number;
  label: string;
}

export interface DbConversation {
  id: number;
  conversation_id: string;
  agent_id: string;
  user_wallet: string | null;
  started_at: number;
  last_message_at: number;
  message_count: number;
}

export interface DbMessage {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: number;
}

export function createEmptyDb(): DbSchema {
  return {
    agents: [],
    team_members: [],
    conversations: [],
    messages: [],
    _nextId: { agents: 1, team_members: 1, conversations: 1, messages: 1 },
  };
}
