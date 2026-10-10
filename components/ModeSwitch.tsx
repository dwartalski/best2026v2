"use client";

import { motion } from "framer-motion";
import { Clapperboard, Shuffle, Type, type LucideIcon } from "lucide-react";
import type { GenerateMode } from "@/lib/schemas";

const MODES: { id: GenerateMode; label: string; icon: LucideIcon }[] = [
  { id: "text", label: "Wpisz temat", icon: Type },
  { id: "video", label: "Wybierz Reelsa", icon: Clapperboard },
  { id: "hybrid", label: "Hybrydowy", icon: Shuffle },
];

interface ModeSwitchProps {
  mode: GenerateMode;
  onChange: (mode: GenerateMode) => void;
  disabled?: boolean;
}

export function ModeSwitch({ mode, onChange, disabled }: ModeSwitchProps) {
  return (
    <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-900 p-1">
      {MODES.map(({ id, label, icon: Icon }) => {
        const active = id === mode;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
              active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded-xl bg-violet-600"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="relative size-4" aria-hidden />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
