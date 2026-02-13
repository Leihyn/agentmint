import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  bagsApiKey: process.env.BAGS_API_KEY || "",
  solanaRpcUrl:
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
} as const;

export function validateConfig() {
  const missing: string[] = [];
  if (!config.bagsApiKey) missing.push("BAGS_API_KEY");
  if (!config.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");

  if (missing.length > 0) {
    console.warn(`Warning: Missing env vars: ${missing.join(", ")}`);
    console.warn("Some features will be unavailable.");
  }
}
