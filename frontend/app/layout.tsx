import type { Metadata } from "next";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentMint — Mint AI Agents That Earn",
  description:
    "Describe an AI agent, launch its token, and deploy it live. Every trade funds the creator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a]">
        <Providers>
          <NavBar />
          <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
