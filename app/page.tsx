"use client";

import { AnimatePresence } from "framer-motion";
import { Hand, Repeat, ScanFace, SearchX, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { ContextSheet } from "@/components/ContextSheet";
import { GeneratorForm } from "@/components/GeneratorForm";
import { LinkPanel } from "@/components/LinkPanel";
import { MemePreview, type MemePreviewHandle } from "@/components/MemePreview";
import { characterById, characters } from "@/data/characters";
import { templateById, templates } from "@/data/templates";
import { requestMeme } from "@/lib/api";
import { downloadBlob, exportVideo } from "@/lib/exportVideo";
import {
  analyzeDownloadedClip,
  downloadClip,
  previewTemplate,
  sourceKey,
  type ClipSource,
  type DownloadedClip,
  type PipelineStage,
  type PreparedClip,
} from "@/lib/linkPipeline";
import type { GenerateMode, GenerateResponse, MemeTemplate } from "@/lib/schemas";

const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Coś poszło nie tak.";

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

  // Tryb "Wklej link"
  const [linkUrl, setLinkUrl] = useState("");
  const [linkFile, setLinkFile] = useState<File | null>(null);
  const [linkContext, setLinkContext] = useState("");
  const [downloaded, setDownloaded] = useState<DownloadedClip | null>(null);
  const [clip, setClip] = useState<PreparedClip | null>(null);
  const [progress, setProgress] = useState<{ stage: PipelineStage; running: boolean } | null>(null);
  const [manualFace, setManualFace] = useState(false);

  const previewRef = useRef<MemePreviewHandle>(null);

  const linkSource: ClipSource | null = linkFile
    ? { kind: "file", file: linkFile }
    : linkUrl.trim()
      ? { kind: "url", url: linkUrl }
      : null;
  // Pobrany klip i jego analiza są aktualne tylko dla źródła, z którego powstały.
  const currentKey = linkSource ? sourceKey(linkSource) : null;
  const currentDownload = downloaded?.sourceKey === currentKey ? downloaded : null;
  const currentClip = clip?.sourceKey === currentKey ? clip : null;

  const template: MemeTemplate | undefined =
    mode === "link"
      ? (currentClip?.template ?? (currentDownload ? previewTemplate(currentDownload) : undefined))
      : templateId
        ? templateById.get(templateId)
        : undefined;
  const meme =
    result && !result.insufficientSources && result.templateId === template?.id ? result : null;
  const character = meme && faceCharacterId ? (characterById.get(faceCharacterId) ?? null) : null;
  const exporting = exportProgress !== null;
  const imported = template?.source === "imported";

  const resetResult = () => {
    setResult(null);
    setFaceCharacterId(null);
    setError(null);
    setExportError(null);
  };

  const handleModeChange = (next: GenerateMode) => {
    setMode(next);
    setProgress(null);
    resetResult();
  };

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    resetResult();
  };

  const applyResult = (response: GenerateResponse) => {
    setResult(response);
    setFaceCharacterId(response.characterId);
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
      applyResult(response);
      setTemplateId(response.templateId);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  /** Pobranie klipu (bez LLM); pomijane, gdy to samo źródło jest już pobrane. */
  const ensureDownload = async (source: ClipSource): Promise<DownloadedClip> => {
    if (currentDownload) return currentDownload;
    setProgress({ stage: "download", running: true });
    const fresh = await downloadClip(source);
    if (downloaded?.videoUrl.startsWith("blob:")) URL.revokeObjectURL(downloaded.videoUrl);
    setDownloaded(fresh);
    setManualFace(!fresh.hasFace);
    return fresh;
  };

  /** Analiza LLM; pomijana, gdy to samo źródło jest już przeanalizowane. */
  const ensureClip = async (source: ClipSource): Promise<PreparedClip> => {
    if (currentClip) return currentClip;
    const fresh = await ensureDownload(source);
    setProgress({ stage: "analyze", running: true });
    const prepared = await analyzeDownloadedClip(fresh);
    setClip(prepared);
    return prepared;
  };

  const runLinkFlow = async (target: "download" | "analyze" | "generate") => {
    if (!linkSource) return;
    setLoading(true);
    resetResult();
    try {
      if (target === "download") {
        await ensureDownload(linkSource);
        setProgress({ stage: "analyze", running: false });
        return;
      }
      const prepared = await ensureClip(linkSource);
      if (target === "analyze") {
        setProgress({ stage: "generate", running: false });
        return;
      }
      setProgress({ stage: "generate", running: true });
      applyResult(
        await requestMeme({
          mode: "link",
          userInput: linkContext.trim() || undefined,
          customTemplate: prepared.template,
        }),
      );
      setProgress({ stage: "done", running: false });
    } catch (cause) {
      setError(errorMessage(cause));
      setProgress(null);
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
      const clipName = imported ? "link" : meme.templateId;
      downloadBlob(blob, `hestoreels-${faceCharacterId}-${clipName}.${extension}`);
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
          Hesto<span className="text-violet-400">Reels</span>
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
        linkPanel={
          <LinkPanel
            url={linkUrl}
            onUrlChange={setLinkUrl}
            file={linkFile}
            onFileChange={(file) => {
              setLinkFile(file);
              setProgress(null);
              resetResult();
            }}
            context={linkContext}
            onContextChange={setLinkContext}
            progress={progress}
            busy={loading || exporting}
            clip={currentClip}
            download={currentDownload}
            error={error}
            onDownload={() => runLinkFlow("download")}
            onAnalyze={() => runLinkFlow("analyze")}
            onGenerate={() => runLinkFlow("generate")}
          />
        }
      />

      {error && mode !== "link" && (
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
          {imported && currentDownload && !currentDownload.hasFace && (
            <p role="status" className="rounded-xl border border-amber-900/60 bg-amber-950/40 p-3 text-sm text-amber-100">
              Nie znaleziono twarzy w klipie. Po wygenerowaniu mema ustaw wklejkę ręcznie:
              przeciągnij ją na miejsce i dobierz rozmiar.
            </p>
          )}

          <div className={loading ? "animate-pulse" : undefined}>
            <MemePreview
              key={`${template.id}:${template.videoUrl}`}
              ref={previewRef}
              template={template}
              character={character}
              text={meme ? meme.memeText : template.originalText}
              locked={exporting}
              badge={imported ? "🔗 Z linku" : undefined}
              pickFace={imported && !manualFace && (currentDownload?.faceCount ?? 0) > 1}
              manual={imported && manualFace}
            />
          </div>

          {character && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="truncate rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-zinc-800">
                🎭 Face: {character.name}
              </span>
              <div className="flex shrink-0 gap-2">
                {imported && (
                  <button
                    type="button"
                    onClick={() => setManualFace((value) => !value)}
                    disabled={exporting}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {manualFace ? (
                      <ScanFace className="size-4" aria-hidden />
                    ) : (
                      <Hand className="size-4" aria-hidden />
                    )}
                    {manualFace ? "Śledź twarz" : "Ustaw ręcznie"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleChangeFace}
                  disabled={exporting}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  <Repeat className="size-4" aria-hidden />
                  Zmień twarz
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="flex aspect-[9/16] w-full items-center justify-center rounded-3xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
          {loading
            ? mode === "link"
              ? "Pobieram i analizuję klip…"
              : "Zbieram źródła i dobieram szablon…"
            : mode === "text"
              ? "Wpisz temat, a dobierzemy postać i klip."
              : mode === "link"
                ? "Wklej link do reelsa albo wgraj plik."
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
