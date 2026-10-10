"use client";

import type { MemeTemplate } from "@/lib/schemas";

interface TemplateGridProps {
  templates: MemeTemplate[];
  selectedId: string | null;
  onSelect: (templateId: string) => void;
  disabled?: boolean;
}

export function TemplateGrid({ templates, selectedId, onSelect, disabled }: TemplateGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {templates.map((template) => {
        const selected = template.id === selectedId;
        return (
          <button
            key={template.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onSelect(template.id)}
            className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-zinc-900 ring-2 transition disabled:opacity-50 ${
              selected ? "ring-violet-500" : "ring-transparent hover:ring-zinc-600"
            }`}
          >
            {/* Fragment #t sprawia, że miniaturą jest klatka z klipu, a nie czarny początek. */}
            <video
              src={`${template.videoUrl}#t=0.5`}
              muted
              playsInline
              preload="metadata"
              className="size-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pt-6 pb-1.5 text-left text-[11px] leading-tight font-medium text-white">
              {template.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
