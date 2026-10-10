import { detectFaces, loadFaceLandmarker } from "@/lib/faceTracker";
import { MAX_FRAMES } from "@/lib/schemas";

const MAX_FRAME_SIDE = 512;
const JPEG_QUALITY = 0.8;
// "Wyraźna twarz" = wykryta na co najmniej tylu z pobranych klatek.
const MIN_FRAMES_WITH_FACE = 2;

export interface ExtractedFrames {
  /** Klatki jako data URL (image/jpeg), rozłożone równomiernie po klipie. */
  frames: string[];
  duration: number;
  hasFace: boolean;
  /** Największa liczba twarzy widocznych naraz na jednej klatce. */
  faceCount: number;
}

function waitFor(video: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, onEvent);
      video.removeEventListener("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Nie udało się odczytać klipu. Spróbuj pliku MP4 (H.264)."));
    };
    video.addEventListener(event, onEvent);
    video.addEventListener("error", onError);
  });
}

/**
 * Wyciąga klatki z klipu przez <video> + Canvas (bez FFmpeg) i przy okazji
 * sprawdza FaceLandmarkerem, czy w klipie widać twarz.
 */
export async function extractFrames(videoUrl: string): Promise<ExtractedFrames> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;

  try {
    await waitFor(video, "loadeddata");
    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d")!;

    // Bez modelu nie ma też śledzenia na żywo, więc traktujemy to jak brak twarzy.
    const landmarker = await loadFaceLandmarker().catch(() => null);

    const frames: string[] = [];
    let framesWithFace = 0;
    let faceCount = 0;
    for (let index = 0; index < MAX_FRAMES; index++) {
      const time = (duration * (index + 0.5)) / MAX_FRAMES;
      if (Math.abs(video.currentTime - time) > 0.01) {
        video.currentTime = time;
        await waitFor(video, "seeked");
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY));

      const faces = landmarker ? detectFaces(landmarker, video).length : 0;
      if (faces > 0) framesWithFace++;
      faceCount = Math.max(faceCount, faces);
    }

    return { frames, duration, hasFace: framesWithFace >= MIN_FRAMES_WITH_FACE, faceCount };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
