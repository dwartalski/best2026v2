const FPS = 30;
const VIDEO_BITRATE = 6_000_000;

const MIME_CANDIDATES = [
  { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

interface AudioGraph {
  context: AudioContext;
  destination: MediaStreamAudioDestinationNode;
}

// createMediaElementSource można wywołać tylko raz na element <video>.
const audioGraphs = new WeakMap<HTMLVideoElement, AudioGraph>();

function getAudioGraph(video: HTMLVideoElement): AudioGraph {
  let graph = audioGraphs.get(video);
  if (!graph) {
    const context = new AudioContext();
    const source = context.createMediaElementSource(video);
    const destination = context.createMediaStreamDestination();
    source.connect(destination);
    // Po przepięciu przez AudioContext element sam nie gra; podłączamy też głośniki.
    source.connect(context.destination);
    graph = { context, destination };
    audioGraphs.set(video, graph);
  }
  return graph;
}

function once(target: EventTarget, event: string): Promise<void> {
  return new Promise((resolve) =>
    target.addEventListener(event, () => resolve(), { once: true }),
  );
}

export interface ExportOptions {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  onProgress?: (progress: number) => void;
}

export interface ExportResult {
  blob: Blob;
  extension: string;
}

/**
 * Nagrywa canvas podglądu od początku do końca klipu razem z dźwiękiem
 * oryginału. Wywołuj z obsługi kliknięcia (AudioContext wymaga gestu
 * użytkownika). Rysowaniem klatek dalej zajmuje się pętla podglądu.
 */
export async function exportVideo({
  canvas,
  video,
  onProgress,
}: ExportOptions): Promise<ExportResult> {
  if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
    throw new Error("Ta przeglądarka nie obsługuje nagrywania wideo.");
  }
  const format = MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mimeType));
  if (!format) throw new Error("Brak obsługiwanego formatu wideo.");

  const { context, destination } = getAudioGraph(video);
  await context.resume();

  const previous = { loop: video.loop, muted: video.muted, paused: video.paused };
  const stream = new MediaStream([
    ...canvas.captureStream(FPS).getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);
  const recorder = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    videoBitsPerSecond: VIDEO_BITRATE,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const reportProgress = () => {
    if (video.duration > 0) onProgress?.(Math.min(video.currentTime / video.duration, 1));
  };

  try {
    video.pause();
    video.loop = false;
    video.muted = false;
    if (video.currentTime !== 0) {
      video.currentTime = 0;
      await once(video, "seeked");
    }

    video.addEventListener("timeupdate", reportProgress);
    onProgress?.(0);

    const stopped = once(recorder, "stop");
    const ended = Promise.race([
      once(video, "ended"),
      once(video, "error").then(() => {
        throw new Error("Błąd odtwarzania klipu podczas eksportu.");
      }),
    ]);
    recorder.start(250);
    await video.play();
    await ended;
    recorder.stop();
    await stopped;
    onProgress?.(1);

    return {
      blob: new Blob(chunks, { type: format.mimeType.split(";")[0] }),
      extension: format.extension,
    };
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    video.removeEventListener("timeupdate", reportProgress);
    stream.getVideoTracks().forEach((track) => track.stop());
    video.loop = previous.loop;
    video.muted = previous.muted;
    if (!previous.paused) void video.play().catch(() => {});
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
