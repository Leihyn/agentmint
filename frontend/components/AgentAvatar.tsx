"use client";

import { TrendingUp, Code, Pen, BookOpen, Bot } from "lucide-react";

const TEMPLATE_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    color: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  "trading-signals": {
    bg: "bg-gradient-to-br from-blue-600/20 to-cyan-600/20",
    border: "border-blue-500/30",
    color: "text-blue-400",
    Icon: TrendingUp,
  },
  "code-review": {
    bg: "bg-gradient-to-br from-purple-600/20 to-pink-600/20",
    border: "border-purple-500/30",
    color: "text-purple-400",
    Icon: Code,
  },
  "content-creator": {
    bg: "bg-gradient-to-br from-orange-600/20 to-amber-600/20",
    border: "border-orange-500/30",
    color: "text-orange-400",
    Icon: Pen,
  },
  research: {
    bg: "bg-gradient-to-br from-emerald-600/20 to-teal-600/20",
    border: "border-emerald-500/30",
    color: "text-emerald-400",
    Icon: BookOpen,
  },
};

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const FALLBACK_COLORS = [
  { bg: "bg-gradient-to-br from-rose-600/20 to-pink-600/20", border: "border-rose-500/30", color: "text-rose-400" },
  { bg: "bg-gradient-to-br from-violet-600/20 to-indigo-600/20", border: "border-violet-500/30", color: "text-violet-400" },
  { bg: "bg-gradient-to-br from-sky-600/20 to-blue-600/20", border: "border-sky-500/30", color: "text-sky-400" },
  { bg: "bg-gradient-to-br from-lime-600/20 to-green-600/20", border: "border-lime-500/30", color: "text-lime-400" },
];

interface Props {
  templateId: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function AgentAvatar({ templateId, name, size = "md" }: Props) {
  const style = templateId
    ? TEMPLATE_STYLES[templateId]
    : undefined;

  const fallback = FALLBACK_COLORS[hashString(name) % FALLBACK_COLORS.length];
  const bg = style?.bg || fallback.bg;
  const border = style?.border || fallback.border;
  const color = style?.color || fallback.color;
  const Icon = style?.Icon || Bot;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${bg} border ${border} rounded-xl flex items-center justify-center flex-shrink-0`}
    >
      <Icon className={`${iconSizes[size]} ${color}`} />
    </div>
  );
}
