"use client";

import { TrendingUp, Code, Pen, BookOpen } from "lucide-react";
import type { AgentTemplate } from "@/lib/api";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Code,
  Pen,
  BookOpen,
};

interface Props {
  templates: AgentTemplate[];
  selected: string | null;
  onSelect: (templateId: string) => void;
}

export function TemplatePicker({ templates, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {templates.map((t) => {
        const Icon = ICON_MAP[t.icon] || BookOpen;
        const isSelected = selected === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`text-left p-4 rounded-xl border transition ${
              isSelected
                ? "border-brand-500 bg-brand-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-2 ${
                isSelected ? "text-brand-400" : "text-gray-400"
              }`}
            />
            <div className="font-medium text-sm">{t.name}</div>
            <div className="text-xs text-gray-500 mt-1">{t.description}</div>
          </button>
        );
      })}
    </div>
  );
}
