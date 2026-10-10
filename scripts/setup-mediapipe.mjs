// Kopiuje pliki WASM MediaPipe do /public i pobiera model FaceLandmarker,
// żeby śledzenie twarzy działało bez CDN (także offline na demo).
import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "public", "mediapipe");
const modelPath = path.join(target, "face_landmarker.task");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

await mkdir(target, { recursive: true });
await cp(
  path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm"),
  path.join(target, "wasm"),
  { recursive: true },
);

const hasModel = await stat(modelPath).then(
  () => true,
  () => false,
);
if (!hasModel) {
  try {
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await writeFile(modelPath, Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    // Bez lokalnego modelu aplikacja pobierze go z sieci przy pierwszym użyciu.
    console.warn(`[setup-mediapipe] nie pobrano modelu: ${error.message}`);
  }
}
console.log("[setup-mediapipe] gotowe:", path.relative(root, target));
