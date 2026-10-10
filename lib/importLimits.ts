// Limity wspólne dla backendu (yt-dlp) i przeglądarki (wgrywany plik).
export const MAX_CLIP_SECONDS = 30;
export const MAX_CLIP_BYTES = 50 * 1024 * 1024;
export const UPLOAD_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export type ReelPlatform = "instagram" | "tiktok" | "youtube";

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Zwraca platformę i znormalizowany URL albo null, gdy link jest spoza listy:
 * instagram.com, tiktok.com, youtube.com/shorts, youtu.be.
 */
export function parseReelUrl(input: string): { platform: ReelPlatform; url: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  let platform: ReelPlatform;
  if (hostMatches(host, "instagram.com")) platform = "instagram";
  else if (hostMatches(host, "tiktok.com")) platform = "tiktok";
  else if (hostMatches(host, "youtu.be")) platform = "youtube";
  else if (hostMatches(host, "youtube.com") && url.pathname.startsWith("/shorts/")) {
    platform = "youtube";
  } else return null;

  url.hash = "";
  return { platform, url: url.toString() };
}
