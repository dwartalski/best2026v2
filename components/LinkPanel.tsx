"use client";

import { CloudDownload, ScanSearch, TriangleAlert, Upload, X, Zap } from "lucide-react";
import { useRef } from "react";
import { StageProgress } from "@/components/StageProgress";
import type { DownloadedClip, PipelineStage, PreparedClip } from "@/lib/linkPipeline";

interface LinkPanelProps {
  url: string;
  onUrlChange: (url: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  context: string;
  onContextChange: (context: string) => void;
  progress: { stage: PipelineStage; running: boolean } | null;
  busy: boolean;
  /** Wynik analizy dla aktualnie wpisanego linku / wybranego pliku. */
  clip: PreparedClip | null;
  /** Pobrany klip dla aktualnego źródła (jeszcze bez analizy AI). */
  download: DownloadedClip | null;
  error: string | null;
  /** Samo pobranie i podgląd klipu, bez żadnego wywołania AI. */
  onDownload: () => void;
  onAnalyze: () => void;
  onGenerate: () => void;
}

export function LinkPanel({
  url,
  onUrlChange,
  file,
  onFileChange,
  context,
  onContextChange,
  progress,
  busy,
  clip,
  download,
  error,
  onDownload,
  onAnalyze,
  onGenerate,
}: LinkPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSource = file !== null || url.trim().length > 0;
  const inputClass =
    "rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-base text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {file ? (
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white">
            <Upload className="size-4 shrink-0 text-zinc-400" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onFileChange(null)}
              aria-label="Usuń plik"
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <input
            type="url"
            inputMode="url"
            value={url}
            disabled={busy}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://www.instagram.com/reel/…"
            aria-label="Link do reelsa"
            className={inputClass}
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] leading-snug text-zinc-500">
            Używaj klipów publicznych. Pobrane wideo służy tylko do stworzenia mema.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 text-xs font-medium text-violet-300 underline-offset-2 hover:underline disabled:opacity-50"
          >
            albo wgraj plik
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="hidden"
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>

      <input
        type="text"
        value={context}
        maxLength={200}
        disabled={busy}
        onChange={(event) => onContextChange(event.target.value)}
        placeholder="Kontekst (opcjonalnie), np. coś o Napoleonie"
        aria-label="Kontekst (opcjonalnie)"
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy || !hasSource}
          onClick={onAnalyze}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-3 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-500"
        >
          <ScanSearch className="size-4" aria-hidden />
          Analizuj
        </button>
        <button
          type="button"
          disabled={busy || !hasSource}
          onClick={onGenerate}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          <Zap className="size-4" aria-hidden />
          Generuj w locie
        </button>
      </div>

      <button
        type="button"
        disabled={busy || !hasSource}
        onClick={onDownload}
        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-600"
      >
        <CloudDownload className="size-4" aria-hidden />
        Tylko pobierz i pokaż klip (bez AI)
      </button>

      {progress && <StageProgress stage={progress.stage} running={progress.running} />}

      {error && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {error}{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-semibold underline underline-offset-2"
            >
              Wgraj plik z klipem
            </button>
          </p>
        </div>
      )}

      {download && !clip && (
        <p role="status" className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-300">
          Klip pobrany: {Math.round(download.duration)} s
          {download.author ? `, autor: ${download.author}` : ""}. Wykryte twarze:{" "}
          {download.hasFace ? download.faceCount : "brak"}. Analiza i generowanie jeszcze nie
          były uruchamiane.
        </p>
      )}

      {clip && (
        <dl className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Analiza klipu
            </dt>
            <dd
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                clip.analysis.confidence === "high"
                  ? "bg-emerald-950 text-emerald-300"
                  : "bg-amber-950 text-amber-300"
              }`}
            >
              pewność: {clip.analysis.confidence === "high" ? "wysoka" : "niska"}
            </dd>
          </div>
          <dd className="flex flex-wrap gap-1">
            {clip.template.vibe.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {tag}
              </span>
            ))}
          </dd>
          <dd className="text-zinc-300">{clip.analysis.emotionSummary}</dd>
          <div>
            <dt className="text-xs text-zinc-500">Oryginalny tekst</dt>
            <dd className="text-zinc-100">{clip.template.originalText}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Szablon</dt>
            <dd className="font-mono text-xs text-violet-200">{clip.template.textTemplate}</dd>
          </div>
          {clip.analysis.confidence === "low" && (
            <dd className="text-xs text-amber-200/80">
              W klipie nie było czytelnego tekstu mema, więc szablon jest propozycją AI.
            </dd>
          )}
        </dl>
      )}
    </div>
  );
}
