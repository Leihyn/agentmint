import crypto from "crypto";
import { getDb, saveDb, nextId } from "../db";
import type { DbConversation, DbMessage } from "../db/schema";

export function getOrCreateConversation(
  conversationId: string | undefined,
  agentId: string,
  userWallet: string | null
): DbConversation {
  const db = getDb();

  if (conversationId) {
    const existing = db.conversations.find(
      (c) => c.conversation_id === conversationId
    );
    if (existing) return existing;
  }

  const newConv: DbConversation = {
    id: nextId("conversations"),
    conversation_id: crypto.randomUUID(),
    agent_id: agentId,
    user_wallet: userWallet,
    started_at: Date.now(),
    last_message_at: Date.now(),
    message_count: 0,
  };

  db.conversations.push(newConv);
  saveDb();
  return newConv;
}

export function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): DbMessage {
  const db = getDb();
  const msg: DbMessage = {
    id: nextId("messages"),
    conversation_id: conversationId,
    role,
    content,
    created_at: Date.now(),
  };

  db.messages.push(msg);

  // Update conversation stats
  const conv = db.conversations.find(
    (c) => c.conversation_id === conversationId
  );
  if (conv) {
    conv.message_count += 1;
    conv.last_message_at = Date.now();
  }

  saveDb();
  return msg;
}

export function getMessages(
  conversationId: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const db = getDb();
  return db.messages
    .filter((m) => m.conversation_id === conversationId)
    .sort((a, b) => a.created_at - b.created_at)
    .map((m) => ({ role: m.role, content: m.content }));
}

export function getConversationsByAgent(agentId: string): DbConversation[] {
  const db = getDb();
  return db.conversations
    .filter((c) => c.agent_id === agentId)
    .sort((a, b) => b.last_message_at - a.last_message_at);
}
