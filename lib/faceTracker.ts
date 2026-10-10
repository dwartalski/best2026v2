import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { FaceKeyframe } from "@/lib/schemas";

/**
 * Pozycja twarzy znormalizowana względem klatki wideo (ten sam układ co
 * FaceKeyframe): x/y to środek twarzy w 0..1, scale to odległość między
 * oczami jako ułamek szerokości klatki, rotation to kąt linii oczu (rad).
 */
export interface FacePose {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

// Pliki kopiuje scripts/setup-mediapipe.mjs (postinstall), żeby demo działało bez internetu.
const WASM_PATH = "/mediapipe/wasm";
const LOCAL_MODEL = "/mediapipe/face_landmarker.task";
const REMOTE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Indeksy siatki MediaPipe Face Mesh.
const RIGHT_EYE = [33, 133];
const LEFT_EYE = [362, 263];
const FOREHEAD = 10;
const CHIN = 152;

const SMOOTHING = 0.45;
// Po zgubieniu twarzy trzymamy ostatnią pozycję przez chwilę, zanim przejdziemy na klatki kluczowe.
const HOLD_LAST_POSE_MS = 300;

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function createLandmarker(): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const localModelExists = await fetch(LOCAL_MODEL, { method: "HEAD" })
    .then((response) => response.ok)
    .catch(() => false);
  const modelAssetPath = localModelExists ? LOCAL_MODEL : REMOTE_MODEL;

  const create = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
    });

  try {
    return await create("GPU");
  } catch {
    return create("CPU");
  }
}

/** Jeden współdzielony FaceLandmarker na całą aplikację. */
export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= createLandmarker().catch((error) => {
    landmarkerPromise = null;
    throw error;
  });
  return landmarkerPromise;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpAngle(a: number, b: number, t: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

function lerpPose(a: FacePose, b: FacePose, t: number): FacePose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    scale: lerp(a.scale, b.scale, t),
    rotation: lerpAngle(a.rotation, b.rotation, t),
  };
}

/** Interpolacja liniowa między ręcznymi klatkami kluczowymi szablonu. */
export function poseFromKeyframes(
  keyframes: FaceKeyframe[] | undefined,
  time: number,
): FacePose | null {
  if (!keyframes || keyframes.length === 0) return null;
  if (time <= keyframes[0].t) return keyframes[0];

  for (let i = 1; i < keyframes.length; i++) {
    const previous = keyframes[i - 1];
    const next = keyframes[i];
    if (time <= next.t) {
      const span = next.t - previous.t;
      return lerpPose(previous, next, span > 0 ? (time - previous.t) / span : 1);
    }
  }
  return keyframes[keyframes.length - 1];
}

export class FaceTracker {
  private smoothed: FacePose | null = null;
  private lastDetectionAt = -Infinity;
  private lastMediaTime = 0;
  private lastTimestamp = 0;

  constructor(
    private readonly landmarker: FaceLandmarker | null,
    private readonly keyframes?: FaceKeyframe[],
  ) {}

  /** Zwraca pozycję twarzy dla bieżącej klatki albo null, gdy nie ma czego wkleić. */
  track(video: HTMLVideoElement): FacePose | null {
    const mediaTime = video.currentTime;
    const now = performance.now();

    // Zapętlenie lub przewinięcie: stara wygładzona pozycja nie pasuje do nowej klatki.
    if (Math.abs(mediaTime - this.lastMediaTime) > 0.5) {
      this.smoothed = null;
      this.lastDetectionAt = -Infinity;
    }
    this.lastMediaTime = mediaTime;

    const detected = this.detect(video, now);
    if (detected) {
      this.smoothed = this.smoothed
        ? lerpPose(this.smoothed, detected, SMOOTHING)
        : detected;
      this.lastDetectionAt = now;
      return this.smoothed;
    }

    if (this.smoothed && now - this.lastDetectionAt < HOLD_LAST_POSE_MS) {
      return this.smoothed;
    }
    this.smoothed = null;
    return poseFromKeyframes(this.keyframes, mediaTime);
  }

  private detect(video: HTMLVideoElement, now: number): FacePose | null {
    if (!this.landmarker || video.readyState < 2 || video.videoWidth === 0) {
      return null;
    }
    // detectForVideo wymaga ściśle rosnących znaczników czasu, więc nie używamy currentTime.
    const timestamp = Math.max(now, this.lastTimestamp + 1);
    this.lastTimestamp = timestamp;

    let landmarks;
    try {
      landmarks = this.landmarker.detectForVideo(video, timestamp).faceLandmarks[0];
    } catch {
      return null;
    }
    if (!landmarks) return null;

    // Landmarki są znormalizowane osobno w X i Y; kąt i odległości liczymy w pikselach.
    const { videoWidth: width, videoHeight: height } = video;
    const point = (index: number) => ({
      x: landmarks[index].x * width,
      y: landmarks[index].y * height,
    });
    const midpoint = ([a, b]: number[]) => {
      const p = point(a);
      const q = point(b);
      return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    };

    const rightEye = midpoint(RIGHT_EYE);
    const leftEye = midpoint(LEFT_EYE);
    const center = midpoint([FOREHEAD, CHIN]);
    const dx = leftEye.x - rightEye.x;
    const dy = leftEye.y - rightEye.y;

    return {
      x: center.x / width,
      y: center.y / height,
      scale: Math.hypot(dx, dy) / width,
      rotation: Math.atan2(dy, dx),
    };
  }
}
