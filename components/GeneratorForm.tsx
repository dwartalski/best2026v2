"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { ModeSwitch } from "@/components/ModeSwitch";
import { TemplateGrid } from "@/components/TemplateGrid";
import type { GenerateMode, MemeTemplate } from "@/lib/schemas";

const INPUT_COPY: Record<"text" | "hybrid", { label: string; placeholder: string }> = {
  text: { label: "Temat", placeholder: "np. Henryk VIII" },
  hybrid: { label: "Luźny kontekst", placeholder: "np. coś o Napoleonie i zimie" },
};

interface GeneratorFormProps {
  mode: GenerateMode;
  onModeChange: (mode: GenerateMode) => void;
  userInput: string;
  onUserInputChange: (value: string) => void;
  templates: MemeTemplate[];
  templateId: string | null;
  onTemplateSelect: (templateId: string) => void;
  loading: boolean;
  onSubmit: () => void;
  /** Panel trybu "Wklej link"; ma własne pola i przyciski zamiast wspólnego formularza. */
  linkPanel: ReactNode;
}

export function GeneratorForm({
  mode,
  onModeChange,
  userInput,
  onUserInputChange,
  templates,
  templateId,
  onTemplateSelect,
  loading,
  onSubmit,
  linkPanel,
}: GeneratorFormProps) {
  const needsInput = mode !== "video";
  const needsTemplate = mode !== "text";
  const canSubmit =
    !loading && (!needsInput || userInput.trim().length > 0) && (!needsTemplate || templateId);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  if (mode === "link") {
    return (
      <div className="flex flex-col gap-3">
        <ModeSwitch mode={mode} onChange={onModeChange} disabled={loading} />
        {linkPanel}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <ModeSwitch mode={mode} onChange={onModeChange} disabled={loading} />

      {needsTemplate && (
        <TemplateGrid
          templates={templates}
          selectedId={templateId}
          onSelect={onTemplateSelect}
          disabled={loading}
        />
      )}

      {mode !== "video" && (
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          {INPUT_COPY[mode].label}
          <input
            type="text"
            value={userInput}
            maxLength={200}
            disabled={loading}
            onChange={(event) => onUserInputChange(event.target.value)}
            placeholder={INPUT_COPY[mode].placeholder}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-base text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none disabled:opacity-50"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {loading ? "Sprawdzam źródła i generuję…" : "Generuj mema"}
      </button>
    </form>
  );
}
