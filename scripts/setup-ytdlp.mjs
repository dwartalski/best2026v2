// Pobiera samodzielną binarkę yt-dlp do bin/. W odróżnieniu od wersji z paczki
// youtube-dl-exec (skrypt Pythona) zawiera ona curl_cffi, bez którego TikTok
// odrzuca zapytania, i nie wymaga Pythona na serwerze.
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = {
  "linux-x64": "yt-dlp_linux",
  "linux-arm64": "yt-dlp_linux_aarch64",
  "darwin-x64": "yt-dlp_macos",
  "darwin-arm64": "yt-dlp_macos",
  "win32-x64": "yt-dlp.exe",
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asset = ASSETS[`${process.platform}-${process.arch}`];
const target = path.join(root, "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

if (!asset) {
  console.warn("[setup-ytdlp] brak binarki dla tej platformy; zostaje wersja z youtube-dl-exec");
} else if (await stat(target).catch(() => null)) {
  console.log("[setup-ytdlp] już jest:", path.relative(root, target));
} else {
  try {
    const response = await fetch(
      `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    await chmod(target, 0o755);
    console.log("[setup-ytdlp] pobrano:", path.relative(root, target));
  } catch (error) {
    // Bez tej binarki import działa dalej przez youtube-dl-exec, ale bez TikToka.
    console.warn(`[setup-ytdlp] nie pobrano yt-dlp: ${error.message}`);
  }
}
