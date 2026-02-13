import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import {
  getToolsForAgent,
  createAskAgentTool,
  type ToolDefinition,
} from "./tools";
import { getTemplate } from "../templates";
import type { AgentConfig, GenerateAgentResponse } from "../types";

const MODEL = "claude-sonnet-4-5-20250929";

function getClient() {
  return new Anthropic({ apiKey: config.anthropicApiKey });
}

// --- SSE Event Types ---

export type ChatStreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string }
  | { type: "tool_result"; name: string }
  | { type: "agent_call"; agentId: string; agentName: string }
  | { type: "agent_result"; agentId: string; response: string }
  | { type: "done"; conversationId: string; toolsUsed: string[] }
  | { type: "error"; message: string };

export interface AgentCallOptions {
  callDepth?: number;
  callerAgentId?: string;
  agentLookup?: (
    agentId: string
  ) => Promise<{ name: string; config: AgentConfig } | null>;
}

// --- Generate Agent Config from Description ---

export async function generateAgentConfig(
  description: string,
  templateId?: string
): Promise<GenerateAgentResponse> {
  const client = getClient();
  const template = templateId ? getTemplate(templateId) : undefined;

  const systemPrompt = `You are AgentMint, a platform that creates AI agents with their own tokens.

Given a user's description of what kind of agent they want, generate a complete agent configuration.

${template ? `The user selected the "${template.name}" template. Use these defaults as a starting point:\n${JSON.stringify(template.defaultConfig, null, 2)}\n\nTemplate hint: ${template.systemPromptHint}` : ""}

Available tools that agents can use:
- get_crypto_price: Get live crypto prices from CoinGecko
- get_solana_token_info: Get Solana token stats (price, mcap, holders)
- web_search: Search the web for current information
- fetch_url: Fetch and read web page content
- calculate: Evaluate math expressions

Respond with a JSON object (no markdown fences) matching this exact shape:
{
  "config": {
    "systemPrompt": "The agent's system prompt - detailed instructions for its behavior",
    "personality": "analytical" | "friendly" | "creative" | "scholarly",
    "enabledTools": ["tool_name_1", "tool_name_2"],
    "temperature": 0.7,
    "maxTurns": 5,
    "greeting": "What the agent says first in a conversation",
    "examplePrompts": ["Example 1", "Example 2", "Example 3"]
  },
  "suggestedName": "Short catchy agent name",
  "suggestedSymbol": "3-6 char ticker symbol, ALL CAPS",
  "suggestedDescription": "One-sentence description of the agent"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Create an agent with this description: ${description}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonStr = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr) as GenerateAgentResponse;

  // Defaults
  parsed.config.systemPrompt ||= "You are a helpful AI agent.";
  parsed.config.personality ||= "friendly";
  parsed.config.enabledTools ||= [];
  parsed.config.temperature ||= 0.7;
  parsed.config.maxTurns ||= 5;
  parsed.config.greeting ||= "Hello! How can I help you?";
  parsed.config.examplePrompts ||= [];

  return parsed;
}

// --- Run Agent Chat (non-streaming, kept for fallback) ---

export async function runAgentChat(
  agentConfig: AgentConfig,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  options?: AgentCallOptions
): Promise<{ response: string; toolsUsed: string[] }> {
  const client = getClient();
  const tools: ToolDefinition[] = getToolsForAgent(agentConfig.enabledTools);
  const toolsUsed: string[] = [];

  // Inject ask_agent tool if conditions are met
  const callDepth = options?.callDepth ?? 0;
  if (
    agentConfig.enabledTools.includes("ask_agent") &&
    options?.agentLookup &&
    callDepth < 2
  ) {
    tools.push(
      createAskAgentTool({
        getAgent: options.agentLookup,
        runChat: (config, history, message) =>
          runAgentChat(config, history, message, {
            ...options,
            callDepth: callDepth + 1,
          }),
        onEvent: () => {},
        callDepth,
        maxDepth: 2,
        callerAgentId: options.callerAgentId || "",
      })
    );
  }

  const anthropicTools: Anthropic.Messages.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
  }));

  const messages: Anthropic.Messages.MessageParam[] = [
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  let currentMessages = messages;
  let turns = 0;

  while (turns < agentConfig.maxTurns) {
    turns++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: agentConfig.temperature,
      system: agentConfig.systemPrompt,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      messages: currentMessages,
    });

    if (
      response.stop_reason === "end_turn" ||
      !response.content.some((b) => b.type === "tool_use")
    ) {
      const finalText = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n");
      return { response: finalText, toolsUsed };
    }

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const tool = tools.find((t) => t.name === block.name);
        if (tool) {
          toolsUsed.push(block.name);
          const result = await tool.execute(
            block.input as Record<string, unknown>
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Tool "${block.name}" not available.`,
            is_error: true,
          });
        }
      }
    }

    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults },
    ];
  }

  return {
    response:
      "I've reached the maximum number of steps for this turn. Here's what I found so far.",
    toolsUsed,
  };
}

// --- Run Agent Chat (streaming via SSE) ---

export async function runAgentChatStreaming(
  agentConfig: AgentConfig,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  onEvent: (event: ChatStreamEvent) => void,
  options?: AgentCallOptions
): Promise<{ fullResponse: string; toolsUsed: string[] }> {
  const client = getClient();
  const tools: ToolDefinition[] = getToolsForAgent(agentConfig.enabledTools);
  const toolsUsed: string[] = [];
  let fullResponse = "";

  // Inject ask_agent tool if conditions are met
  const callDepth = options?.callDepth ?? 0;
  if (
    agentConfig.enabledTools.includes("ask_agent") &&
    options?.agentLookup &&
    callDepth < 2
  ) {
    tools.push(
      createAskAgentTool({
        getAgent: options.agentLookup,
        runChat: (config, history, message) =>
          runAgentChat(config, history, message, {
            ...options,
            callDepth: callDepth + 1,
          }),
        onEvent: (event) => onEvent(event as ChatStreamEvent),
        callDepth,
        maxDepth: 2,
        callerAgentId: options.callerAgentId || "",
      })
    );
  }

  const anthropicTools: Anthropic.Messages.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
  }));

  const messages: Anthropic.Messages.MessageParam[] = [
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  let currentMessages = messages;
  let turns = 0;

  while (turns < agentConfig.maxTurns) {
    turns++;

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      temperature: agentConfig.temperature,
      system: agentConfig.systemPrompt,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      messages: currentMessages,
    });

    // Stream text deltas as they arrive
    stream.on("text", (text) => {
      fullResponse += text;
      onEvent({ type: "text", content: text });
    });

    // Wait for the complete message
    const finalMessage = await stream.finalMessage();

    // Check for tool use
    const toolUseBlocks = finalMessage.content.filter(
      (b) => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      // No tool calls — we're done
      break;
    }

    // Execute tools
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of finalMessage.content) {
      if (block.type === "tool_use") {
        const tool = tools.find((t) => t.name === block.name);
        if (tool) {
          toolsUsed.push(block.name);
          onEvent({ type: "tool_call", name: block.name });
          const result = await tool.execute(
            block.input as Record<string, unknown>
          );
          onEvent({ type: "tool_result", name: block.name });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Tool "${block.name}" not available.`,
            is_error: true,
          });
        }
      }
    }

    // Reset fullResponse for the next turn (we want the final text)
    fullResponse = "";

    // Continue conversation with tool results
    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: finalMessage.content },
      { role: "user", content: toolResults },
    ];
  }

  return { fullResponse, toolsUsed };
}

// --- Generate Live Greeting ---

export async function generateLiveGreeting(
  agentConfig: AgentConfig,
  onEvent: (event: ChatStreamEvent) => void
): Promise<{ fullResponse: string; toolsUsed: string[] }> {
  const greetingPrompt = `Generate a brief, personalized opening greeting for a new user visiting your chat. Use your tools to include live, current data relevant to your domain. Keep it to 2-3 sentences. Be welcoming but lead with real data.`;

  return runAgentChatStreaming(agentConfig, [], greetingPrompt, onEvent);
}
