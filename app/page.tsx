"use client";

import { AnimatePresence } from "framer-motion";
import { Repeat, SearchX, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { ContextSheet } from "@/components/ContextSheet";
import { GeneratorForm } from "@/components/GeneratorForm";
import { MemePreview, type MemePreviewHandle } from "@/components/MemePreview";
import { characterById, characters } from "@/data/characters";
import { templateById, templates } from "@/data/templates";
import { requestMeme } from "@/lib/api";
import { downloadBlob, exportVideo } from "@/lib/exportVideo";
import type { GenerateMode, GenerateResponse } from "@/lib/schemas";

export default function Home() {
  const [mode, setMode] = useState<GenerateMode>("text");
  const [userInput, setUserInput] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  // Postać na ekranie; "Zmień twarz" podmienia ją lokalnie, bez wywołania AI.
  const [faceCharacterId, setFaceCharacterId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const previewRef = useRef<MemePreviewHandle>(null);

  const meme = result && !result.insufficientSources ? result : null;
  const template = templateId ? templateById.get(templateId) : undefined;
  const character = meme && faceCharacterId ? (characterById.get(faceCharacterId) ?? null) : null;
  const exporting = exportProgress !== null;

  const resetResult = () => {
    setResult(null);
    setFaceCharacterId(null);
    setError(null);
    setExportError(null);
  };

  const handleModeChange = (next: GenerateMode) => {
    setMode(next);
    resetResult();
  };

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    resetResult();
  };

  const handleGenerate = async () => {
    setLoading(true);
    resetResult();
    try {
      const response = await requestMeme({
        mode,
        userInput: mode === "video" ? undefined : userInput.trim(),
        templateId: mode === "text" ? undefined : (templateId ?? undefined),
      });
      setResult(response);
      setTemplateId(response.templateId);
      setFaceCharacterId(response.characterId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Coś poszło nie tak.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFace = () => {
    const index = characters.findIndex((c) => c.id === faceCharacterId);
    setFaceCharacterId(characters[(index + 1) % characters.length].id);
  };

  const handleDownload = async () => {
    const canvas = previewRef.current?.getCanvas();
    const video = previewRef.current?.getVideo();
    if (!canvas || !video || !meme) return;

    setExportError(null);
    setExportProgress(0);
    try {
      const { blob, extension } = await exportVideo({
        canvas,
        video,
        onProgress: setExportProgress,
      });
      downloadBlob(blob, `memehistory-${faceCharacterId}-${meme.templateId}.${extension}`);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "Eksport nie powiódł się.");
    } finally {
      setExportProgress(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-5 pb-40">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Meme<span className="text-violet-400">History</span>
        </h1>
        <p className="text-sm text-zinc-500">Viralowy klip, historyczna twarz, sprawdzone fakty.</p>
      </header>

      <GeneratorForm
        mode={mode}
        onModeChange={handleModeChange}
        userInput={userInput}
        onUserInputChange={setUserInput}
        templates={templates}
        templateId={templateId}
        onTemplateSelect={handleTemplateSelect}
        loading={loading || exporting}
        onSubmit={handleGenerate}
      />

      {error && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {result?.insufficientSources && (
        <div role="status" className="flex gap-2 rounded-xl border border-amber-900/60 bg-amber-950/40 p-3 text-sm text-amber-100">
          <SearchX className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Nasze źródła nie wystarczają, żeby zrobić z tego rzetelnego mema, a zmyślać nie
            będziemy. Spróbuj innego tematu albo innego klipu.
          </p>
        </div>
      )}

      {template ? (
        <section className="flex flex-col gap-3">
          <div className={loading ? "animate-pulse" : undefined}>
            <MemePreview
              key={template.id}
              ref={previewRef}
              template={template}
              character={character}
              text={meme ? meme.memeText : template.originalText}
              locked={exporting}
            />
          </div>

          {character && (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-zinc-800">
                🎭 Face: {character.name}
              </span>
              <button
                type="button"
                onClick={handleChangeFace}
                disabled={exporting}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
              >
                <Repeat className="size-4" aria-hidden />
                Zmień twarz
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="flex aspect-[9/16] w-full items-center justify-center rounded-3xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
          {loading
            ? "Zbieram źródła i dobieram szablon…"
            : mode === "text"
              ? "Wpisz temat, a dobierzemy postać i klip."
              : "Wybierz klip powyżej."}
        </div>
      )}

      <AnimatePresence>
        {meme && (
          <ContextSheet
            key={`${meme.templateId}-${meme.characterId}-${meme.memeText}`}
            shortContext={meme.shortContext}
            sources={meme.sources}
            exportProgress={exportProgress}
            exportError={exportError}
            onDownload={handleDownload}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
