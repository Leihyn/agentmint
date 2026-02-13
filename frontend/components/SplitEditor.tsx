"use client";

import { useState, useCallback } from "react";
import type { TeamMember } from "@/lib/api";

interface Props {
  members: TeamMember[];
  onChange: (updated: TeamMember[]) => void;
}

export function SplitEditor({ members, onChange }: Props) {
  const [items, setItems] = useState(members);

  const handleBpsChange = useCallback(
    (index: number, newBps: number) => {
      const updated = [...items];
      const oldBps = updated[index].bps;
      const diff = newBps - oldBps;

      if (newBps < 0 || newBps > 10000) return;

      updated[index] = { ...updated[index], bps: newBps };

      // Redistribute diff proportionally among others
      const others = updated.filter((_, i) => i !== index);
      const otherTotal = others.reduce((sum, c) => sum + c.bps, 0);

      if (otherTotal > 0 && diff !== 0) {
        let remaining = -diff;
        for (let i = 0; i < updated.length; i++) {
          if (i === index) continue;
          const share = updated[i].bps / otherTotal;
          const adjustment = Math.round(share * remaining);
          updated[i] = {
            ...updated[i],
            bps: Math.max(0, updated[i].bps + adjustment),
          };
          remaining -= adjustment;
        }
      }

      // Fix rounding
      const total = updated.reduce((sum, c) => sum + c.bps, 0);
      if (total !== 10000 && updated.length > 0) {
        const adjustIdx = index === 0 ? 1 : 0;
        if (updated[adjustIdx]) {
          updated[adjustIdx] = {
            ...updated[adjustIdx],
            bps: updated[adjustIdx].bps + (10000 - total),
          };
        }
      }

      setItems(updated);
      onChange(updated);
    },
    [items, onChange]
  );

  const totalBps = items.reduce((sum, c) => sum + c.bps, 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-400">
        <span>Fee Split Editor</span>
        <span
          className={
            totalBps === 10000 ? "text-brand-400" : "text-red-400"
          }
        >
          Total: {totalBps.toLocaleString()} / 10,000 BPS
        </span>
      </div>

      <div className="space-y-2">
        {items.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white/5 rounded-lg px-4 py-2"
          >
            <span className="text-sm flex-1 truncate">{m.label}</span>
            <input
              type="range"
              min={0}
              max={10000}
              value={m.bps}
              onChange={(e) => handleBpsChange(i, parseInt(e.target.value))}
              className="w-32 accent-brand-500"
            />
            <input
              type="number"
              min={0}
              max={10000}
              value={m.bps}
              onChange={(e) =>
                handleBpsChange(i, parseInt(e.target.value) || 0)
              }
              className="w-20 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm
                         text-right tabular-nums focus:outline-none focus:border-brand-500"
            />
            <span className="text-xs text-gray-500 w-16 text-right">
              {(m.bps / 100).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
