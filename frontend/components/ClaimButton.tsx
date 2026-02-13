"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { createClaimTx } from "@/lib/api";

interface Props {
  mint: string;
  claimableAmount: number;
}

export function ClaimButton({ mint, claimableAmount }: Props) {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClaim() {
    if (!publicKey || !signTransaction) return;

    setLoading(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const { serializedTx } = await createClaimTx(
        publicKey.toBase58(),
        mint
      );

      const tx = Transaction.from(Buffer.from(serializedTx, "base64"));
      const signed = await signTransaction(tx);

      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          "https://api.mainnet-beta.solana.com"
      );
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <span className="text-xs text-gray-500">Connect wallet to claim</span>
    );
  }

  if (claimableAmount <= 0) {
    return <span className="text-xs text-gray-500">Nothing to claim</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClaim}
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-500 text-white text-sm px-4 py-1.5 rounded-lg
                   font-medium transition disabled:opacity-50"
      >
        {loading ? "Claiming..." : `Claim ${claimableAmount.toFixed(4)} SOL`}
      </button>
      {status === "success" && (
        <span className="text-xs text-brand-400">Claimed!</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-400">{errorMsg}</span>
      )}
    </div>
  );
}
