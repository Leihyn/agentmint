import { config } from "../config";

const BAGS_BASE_URL = "https://api.bags.fm";

async function bagsRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${BAGS_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.bagsApiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bags API error ${res.status}: ${text}`);
  }

  return res.json();
}

// --- Wallet Resolution ---

export async function resolveGitHubWallets(
  usernames: string[]
): Promise<Record<string, string | null>> {
  if (usernames.length === 0) return {};

  try {
    const data = (await bagsRequest(
      "POST",
      "/fee-share/wallet/v2/bulk",
      { github_usernames: usernames }
    )) as { wallets: Record<string, string | null> };

    return data.wallets || {};
  } catch (err) {
    console.error("Wallet resolution failed:", err);
    // Return all null on failure
    return Object.fromEntries(usernames.map((u) => [u, null]));
  }
}

// --- Token Creation ---

export interface CreateTokenInfoParams {
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  creatorWallet: string;
}

export async function createTokenInfo(
  params: CreateTokenInfoParams
): Promise<{ mint: string; metadataUri: string }> {
  const data = (await bagsRequest("POST", "/token/create-info", {
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    image_url: params.imageUrl || "",
    creator_wallet: params.creatorWallet,
  })) as { mint: string; metadata_uri: string };

  return { mint: data.mint, metadataUri: data.metadata_uri };
}

// --- Fee Share Configuration ---

export interface FeeShareConfig {
  mint: string;
  claimers: Array<{ wallet: string; bps: number }>;
}

export async function configureFeeShare(
  feeShareConfig: FeeShareConfig
): Promise<{ configKey: string }> {
  const data = (await bagsRequest("POST", "/fee-share/configure", {
    mint: feeShareConfig.mint,
    claimers: feeShareConfig.claimers,
  })) as { config_key: string };

  return { configKey: data.config_key };
}

// --- Launch Transaction ---

export interface CreateLaunchTxParams {
  mint: string;
  metadataUri: string;
  feeShareConfigKey: string;
  launcherWallet: string;
}

export async function createLaunchTransaction(
  params: CreateLaunchTxParams
): Promise<{ serializedTx: string }> {
  const data = (await bagsRequest("POST", "/token/launch", {
    mint: params.mint,
    metadata_uri: params.metadataUri,
    fee_share_config_key: params.feeShareConfigKey,
    launcher_wallet: params.launcherWallet,
  })) as { serialized_tx: string };

  return { serializedTx: data.serialized_tx };
}

// --- Stats & Claims ---

export async function getTokenStats(
  mint: string
): Promise<{
  lifetimeFees: number;
  holders: number;
  marketCap: number;
  price: number;
}> {
  const data = (await bagsRequest("GET", `/token/${mint}/stats`)) as {
    lifetime_fees: number;
    holders: number;
    market_cap: number;
    price: number;
  };

  return {
    lifetimeFees: data.lifetime_fees || 0,
    holders: data.holders || 0,
    marketCap: data.market_cap || 0,
    price: data.price || 0,
  };
}

export async function getClaimablePositions(
  wallet: string
): Promise<
  Array<{
    mint: string;
    claimableAmount: number;
    totalEarned: number;
    bps: number;
  }>
> {
  const data = (await bagsRequest(
    "GET",
    `/fee-share/claimable/${wallet}`
  )) as {
    positions: Array<{
      mint: string;
      claimable_amount: number;
      total_earned: number;
      bps: number;
    }>;
  };

  return (data.positions || []).map((p) => ({
    mint: p.mint,
    claimableAmount: p.claimable_amount,
    totalEarned: p.total_earned,
    bps: p.bps,
  }));
}

export async function createClaimTransaction(
  wallet: string,
  mint: string
): Promise<{ serializedTx: string }> {
  const data = (await bagsRequest("POST", "/fee-share/claim", {
    wallet,
    mint,
  })) as { serialized_tx: string };

  return { serializedTx: data.serialized_tx };
}
