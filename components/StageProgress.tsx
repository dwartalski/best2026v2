"use client";

import { Check, LoaderCircle } from "lucide-react";
import type { PipelineStage } from "@/lib/linkPipeline";

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "download", label: "Pobieranie" },
  { id: "analyze", label: "Analiza" },
  { id: "generate", label: "Generowanie" },
  { id: "done", label: "Gotowe" },
];

interface StageProgressProps {
  stage: PipelineStage;
  /** false = łańcuch zatrzymał się przed tym etapem (np. po samej analizie). */
  running: boolean;
}

export function StageProgress({ stage, running }: StageProgressProps) {
  const current = STAGES.findIndex((item) => item.id === stage);

  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Postęp">
      {STAGES.map((item, index) => {
        const done = index < current || stage === "done";
        const active = index === current && running && !done;
        return (
          <li key={item.id} className="flex flex-col gap-1.5" aria-current={active ? "step" : undefined}>
            <span
              className={`h-1 rounded-full transition-colors ${
                done ? "bg-violet-500" : active ? "animate-pulse bg-violet-400" : "bg-zinc-800"
              }`}
            />
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                done || active ? "text-zinc-200" : "text-zinc-600"
              }`}
            >
              {done && <Check className="size-3 text-violet-400" aria-hidden />}
              {active && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
