import { requestAnalysis, requestImport } from "@/lib/api";
import { extractFrames } from "@/lib/extractFrames";
import {
  MAX_CLIP_BYTES,
  MAX_CLIP_SECONDS,
  UPLOAD_MIME_TYPES,
  parseReelUrl,
} from "@/lib/importLimits";
import type { ClipAnalysis, ImportedTemplate } from "@/lib/schemas";

export type ClipSource = { kind: "url"; url: string } | { kind: "file"; file: File };
export type PipelineStage = "download" | "analyze" | "generate" | "done";

/** Klip po pobraniu i lokalnym wyciągnięciu klatek; do tego etapu nie ma żadnego wywołania LLM. */
export interface DownloadedClip {
  sourceKey: string;
  importId: string;
  videoUrl: string;
  caption: string;
  author?: string;
  frames: string[];
  duration: number;
  hasFace: boolean;
  faceCount: number;
}

export interface PreparedClip {
  sourceKey: string;
  template: ImportedTemplate;
  analysis: ClipAnalysis;
  hasFace: boolean;
  faceCount: number;
}

export function sourceKey(source: ClipSource): string {
  return source.kind === "url"
    ? `url:${source.url.trim()}`
    : `file:${source.file.name}:${source.file.size}:${source.file.lastModified}`;
}

/** Id pliku = hash jego zawartości, żeby cache analizy działał także dla wgranych klipów. */
async function importIdForFile(file: File): Promise<string> {
  // crypto.subtle istnieje tylko w bezpiecznym kontekście (https / localhost).
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"));
    return `f_${hex.join("").slice(0, 24)}`;
  }
  let hash = 0x811c9dc5;
  for (const char of `${file.name}:${file.size}:${file.lastModified}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return `f_${hash.toString(16).padStart(8, "0")}${file.size.toString(16).padStart(8, "0").slice(-8)}`;
}

/** Pobranie (albo przyjęcie pliku) -> klatki + detekcja twarzy w przeglądarce. Bez LLM. */
export async function downloadClip(source: ClipSource): Promise<DownloadedClip> {
  let importId: string;
  let videoUrl: string;
  let caption = "";
  let author: string | undefined;

  if (source.kind === "url") {
    if (!parseReelUrl(source.url)) {
      throw new Error(
        "Nieobsługiwana platforma. Wklej link z Instagram Reels, TikToka lub YouTube Shorts.",
      );
    }
    const imported = await requestImport(source.url.trim());
    ({ importId, videoUrl, caption } = imported);
    author = imported.author || undefined;
  } else {
    const { file } = source;
    if (!UPLOAD_MIME_TYPES.includes(file.type)) {
      throw new Error("Nieobsługiwany format pliku. Wgraj MP4, WebM lub MOV.");
    }
    if (file.size > MAX_CLIP_BYTES) throw new Error("Plik jest za duży. Maksymalnie 50 MB.");
    importId = await importIdForFile(file);
    videoUrl = URL.createObjectURL(file);
  }

  try {
    const extracted = await extractFrames(videoUrl);
    if (extracted.duration > MAX_CLIP_SECONDS + 0.5) {
      throw new Error(
        `Klip jest za długi (${Math.round(extracted.duration)} s). Maksymalnie ${MAX_CLIP_SECONDS} s.`,
      );
    }
    return { sourceKey: sourceKey(source), importId, videoUrl, caption, author, ...extracted };
  } catch (error) {
    if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    throw error;
  }
}

/** Analiza LLM pobranego klipu. Zwraca tymczasowy szablon gotowy do /api/generate. */
export async function analyzeDownloadedClip(clip: DownloadedClip): Promise<PreparedClip> {
  const { template, analysis } = await requestAnalysis({
    importId: clip.importId,
    frames: clip.frames,
    caption: clip.caption,
    author: clip.author,
  });
  return {
    sourceKey: clip.sourceKey,
    template: { ...template, videoUrl: clip.videoUrl },
    analysis,
    hasFace: clip.hasFace,
    faceCount: clip.faceCount,
  };
}

/** Szablon do samego podglądu pobranego klipu, zanim (albo zamiast) przeanalizuje go AI. */
export function previewTemplate(clip: DownloadedClip): ImportedTemplate {
  return {
    id: `import_${clip.importId}`,
    videoUrl: clip.videoUrl,
    title: clip.author ? `Klip od ${clip.author}` : "Zaimportowany klip",
    vibe: ["nieprzeanalizowany"],
    originalText: "",
    textTemplate: "",
    source: "imported",
  };
}
