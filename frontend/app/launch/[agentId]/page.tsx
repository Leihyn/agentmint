"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, Transaction } from "@solana/web3.js";
import { Loader2 } from "lucide-react";
import { LaunchProgress, type LaunchStep } from "@/components/LaunchProgress";
import {
  getAgent,
  launchPrepare,
  launchTransaction,
  launchConfirm,
  type AgentRecord,
} from "@/lib/api";

export default function LaunchAgentPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();
  const { publicKey, signTransaction } = useWallet();

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<LaunchStep>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!agentId) return;
    getAgent(agentId)
      .then(setAgent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agentId]);

  async function handleLaunch() {
    if (!agent || !publicKey || !signTransaction) return;

    setError("");
    setStep("preparing");

    try {
      const claimers =
        agent.teamMembers && agent.teamMembers.length > 0
          ? agent.teamMembers.map((tm) => ({
              wallet: tm.wallet,
              bps: tm.bps,
            }))
          : [{ wallet: publicKey.toBase58(), bps: 10000 }];

      // Step 1: Prepare
      const { mint, metadataUri, feeShareConfigKey } = await launchPrepare(
        agent.agentId,
        {
          metadata: {
            name: agent.tokenName || agent.name,
            symbol: agent.tokenSymbol || "AGENT",
            description: agent.description,
            imageUrl: agent.imageUrl || undefined,
          },
          claimers,
        }
      );

      setStep("configuring");

      // Step 2: Get transaction
      const { serializedTx } = await launchTransaction(agent.agentId, {
        mint,
        metadataUri,
        feeShareConfigKey,
        launcherWallet: publicKey.toBase58(),
      });

      setStep("signing");

      // Step 3: Sign
      const tx = Transaction.from(Buffer.from(serializedTx, "base64"));
      const signed = await signTransaction(tx);

      setStep("broadcasting");

      // Step 4: Broadcast
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          "https://api.mainnet-beta.solana.com"
      );
      const sig = await connection.sendRawTransaction(signed.serialize());

      setStep("confirming");

      // Step 5: Confirm
      await connection.confirmTransaction(sig, "confirmed");

      await launchConfirm(agent.agentId, {
        mint,
        tokenName: agent.tokenName || agent.name,
        tokenSymbol: agent.tokenSymbol || "AGENT",
        metadataUri,
        feeShareConfigKey,
        launchSignature: sig,
      });

      setStep("done");

      // Navigate to agent chat after short delay
      setTimeout(() => {
        router.push(`/agents/${agent.agentId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
      setStep("error");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20 text-gray-500">Agent not found.</div>
    );
  }

  if (agent.status === "launched") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Already Launched</h2>
        <p className="text-gray-400 mb-6">
          This agent already has a live token.
        </p>
        <a
          href={`/agents/${agent.agentId}`}
          className="text-brand-400 hover:underline"
        >
          Go to Agent Chat
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-2">Launch {agent.name}</h1>
      <p className="text-gray-400 text-sm mb-8">
        Deploy your agent&apos;s token on Solana. Every trade generates fees.
      </p>

      {/* Agent summary */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <h3 className="font-semibold">{agent.name}</h3>
        <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
        {agent.tokenSymbol && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Token: </span>
            <span className="font-mono text-brand-400">
              ${agent.tokenSymbol}
            </span>
          </div>
        )}
        {agent.teamMembers && agent.teamMembers.length > 0 && (
          <div className="mt-3 space-y-1">
            <span className="text-xs text-gray-500">Fee Split:</span>
            {agent.teamMembers.map((tm, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-400">{tm.label}</span>
                <span className="text-gray-500">
                  {(tm.bps / 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!publicKey ? (
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      ) : step === "idle" ? (
        <button
          onClick={handleLaunch}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg
                     font-semibold transition"
        >
          Launch Agent Token
        </button>
      ) : (
        <LaunchProgress currentStep={step} error={error} />
      )}

      {step === "done" && (
        <div className="mt-4 text-center">
          <a
            href={`/agents/${agent.agentId}`}
            className="text-brand-400 hover:underline text-sm"
          >
            Go to Agent Chat
          </a>
        </div>
      )}
    </div>
  );
}
