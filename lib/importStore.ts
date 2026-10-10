import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { create as createYoutubeDl, youtubeDl as bundledYoutubeDl } from "youtube-dl-exec";
import { MAX_CLIP_BYTES, MAX_CLIP_SECONDS } from "@/lib/importLimits";
import { ImportResponseSchema, type ApiErrorCode, type ImportResponse } from "@/lib/schemas";

// Poza /public: Next w produkcji serwuje tylko pliki obecne przy buildzie,
// więc klipy wydaje endpoint /api/imports/[id].
const IMPORTS_DIR = process.env.IMPORTS_DIR ?? path.join(os.tmpdir(), "hestoreels-imports");
const YT_DLP_TIMEOUT_MS = 90_000;

// Samodzielna binarka z scripts/setup-ytdlp.mjs ma curl_cffi (wymagane przez TikToka);
// wersja z paczki youtube-dl-exec jest zapasem, gdy tamtej nie udało się pobrać.
const STANDALONE_YT_DLP = path.join(
  process.cwd(),
  "bin",
  process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
);
const youtubedl = existsSync(STANDALONE_YT_DLP)
  ? createYoutubeDl(STANDALONE_YT_DLP)
  : bundledYoutubeDl;
// H.264 + AAC w MP4, bo to odtworzy każda przeglądarka. YouTube podaje obraz i
// dźwięk osobno, więc yt-dlp skleja je FFmpegiem z paczki ffmpeg-static;
// TikTok i Instagram zwykle dają gotowy plik (druga i kolejne alternatywy).
const FORMAT =
  "bv*[vcodec^=avc1][width<=1080]+ba[ext=m4a]/b[vcodec^=avc1][ext=mp4]/b[vcodec^=h264][ext=mp4]/b[ext=mp4]/b";

export class ImportError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status = 422,
  ) {
    super(message);
  }
}

export function importIdForUrl(url: string): string {
  return `u_${createHash("sha256").update(url).digest("hex").slice(0, 24)}`;
}

export function importVideoPath(importId: string): string {
  return path.join(IMPORTS_DIR, `${importId}.mp4`);
}

const metadataPath = (importId: string) => path.join(IMPORTS_DIR, `${importId}.json`);

function toImportError(error: unknown): ImportError {
  const stderr = String((error as { stderr?: string }).stderr ?? (error as Error).message ?? "");
  console.warn("[import] yt-dlp:", stderr.slice(0, 500));

  if (/login|log in|sign in|private|cookies|video unavailable|restricted|rate.?limit/i.test(stderr)) {
    return new ImportError(
      "LOGIN_REQUIRED",
      "Ten link jest prywatny albo platforma wymaga logowania.",
    );
  }
  if (/impersonat/i.test(stderr)) {
    return new ImportError(
      "IMPORT_FAILED",
      "Serwer nie ma pełnej wersji yt-dlp potrzebnej dla tej platformy (uruchom npm install).",
      501,
    );
  }
  if (/unsupported url/i.test(stderr)) {
    return new ImportError("UNSUPPORTED_PLATFORM", "Nieobsługiwana platforma lub typ linku.", 400);
  }
  if ((error as { code?: string }).code === "ENOENT") {
    return new ImportError(
      "IMPORT_FAILED",
      "Na serwerze nie ma yt-dlp (pobieranie z linku nie działa na tym hostingu).",
      501,
    );
  }
  return new ImportError("IMPORT_FAILED", "Nie udało się pobrać klipu z tego linku.");
}

/** Pobiera klip i metadane przez yt-dlp. Ponowny import tego samego URL-a korzysta z plików na dysku. */
export async function importClip(url: string): Promise<ImportResponse> {
  const importId = importIdForUrl(url);
  const videoPath = importVideoPath(importId);

  const cached = await readFile(metadataPath(importId), "utf8").then(
    (raw) => ImportResponseSchema.safeParse(JSON.parse(raw)),
    () => null,
  );
  if (cached?.success && (await stat(videoPath).catch(() => null))) return cached.data;

  await mkdir(IMPORTS_DIR, { recursive: true });
  const cookies = process.env.IG_COOKIES_PATH || undefined;
  const common = { noPlaylist: true, noWarnings: true, cookies };
  const spawnOptions = { timeout: YT_DLP_TIMEOUT_MS };

  let info;
  try {
    info = await youtubedl(url, { ...common, dumpSingleJson: true }, spawnOptions);
  } catch (error) {
    throw toImportError(error);
  }
  if (typeof info === "string") throw new ImportError("IMPORT_FAILED", "Brak metadanych klipu.");

  const duration = Number(info.duration) || 0;
  if (duration > MAX_CLIP_SECONDS) {
    throw new ImportError(
      "CLIP_TOO_LONG",
      `Klip jest za długi (${Math.round(duration)} s). Maksymalnie ${MAX_CLIP_SECONDS} s.`,
    );
  }

  try {
    await youtubedl(
      url,
      {
        ...common,
        format: FORMAT,
        mergeOutputFormat: "mp4",
        ffmpegLocation: ffmpegPath ?? undefined,
        maxFilesize: "50M",
        noPart: true,
        output: videoPath,
      },
      spawnOptions,
    );
  } catch (error) {
    throw toImportError(error);
  }

  // Przy przekroczeniu --max-filesize yt-dlp kończy się sukcesem, ale nie zapisuje pliku.
  const file = await stat(videoPath).catch(() => null);
  if (!file || file.size > MAX_CLIP_BYTES) {
    await rm(videoPath, { force: true });
    throw new ImportError("CLIP_TOO_LARGE", "Klip jest za duży. Maksymalnie 50 MB.");
  }

  const result: ImportResponse = {
    importId,
    videoUrl: `/api/imports/${importId}`,
    caption: String(info.description || info.title || "").slice(0, 2000),
    author: String(info.uploader || info.channel || "").slice(0, 100),
    duration,
  };
  await writeFile(metadataPath(importId), JSON.stringify(result));
  return result;
}
