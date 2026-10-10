import type { FacePose } from "@/lib/faceTracker";

export const CANVAS_WIDTH = 720;
export const CANVAS_HEIGHT = 1280;

// Szerokość wyciętej głowy w PNG względem odległości między oczami...
const HEAD_WIDTH_PER_EYE_DISTANCE = 2.5;
// ...i celowe przeskalowanie, żeby wklejka wyglądała jak ręczny edit, nie deepfake.
const OVERSIZE = 1.2;

const TEXT_FONT_FAMILY = "Arial, Helvetica, sans-serif";
const TEXT_PADDING = 28;
const TEXT_MAX_LINES = 4;
const TEXT_FONT_SIZES = [54, 48, 42, 38, 34, 30, 26];

export interface FrameInput {
  video: HTMLVideoElement;
  /** Gotowa naklejka z lib/faceSticker.ts albo null, gdy nie wklejamy twarzy. */
  face: HTMLCanvasElement | null;
  pose: FacePose | null;
  text: string;
}

/** Prostokąt, w którym klatka wideo ląduje na canvasie przy dopasowaniu "cover". */
function coverRect(video: HTMLVideoElement) {
  const cover = Math.max(CANVAS_WIDTH / video.videoWidth, CANVAS_HEIGHT / video.videoHeight);
  const width = video.videoWidth * cover;
  const height = video.videoHeight * cover;
  return { x: (CANVAS_WIDTH - width) / 2, y: (CANVAS_HEIGHT - height) / 2, width, height };
}

/**
 * Zamienia punkt na canvasie (0..1 szerokości i wysokości) na współrzędne
 * klatki wideo (0..1), czyli ten sam układ, w którym żyje FacePose.
 */
export function canvasToVideoPoint(
  video: HTMLVideoElement,
  point: { x: number; y: number },
): { x: number; y: number } | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  const rect = coverRect(video);
  return {
    x: (point.x * CANVAS_WIDTH - rect.x) / rect.width,
    y: (point.y * CANVAS_HEIGHT - rect.y) / rect.height,
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Biała belka u góry z czarnym tekstem; czcionka maleje, aż tekst zmieści się w limicie linii. */
function drawCaption(ctx: CanvasRenderingContext2D, text: string) {
  const maxWidth = CANVAS_WIDTH - TEXT_PADDING * 2;
  let fontSize = TEXT_FONT_SIZES[TEXT_FONT_SIZES.length - 1];
  let lines: string[] = [];

  for (const size of TEXT_FONT_SIZES) {
    ctx.font = `bold ${size}px ${TEXT_FONT_FAMILY}`;
    lines = wrapText(ctx, text, maxWidth);
    fontSize = size;
    const fitsWidth = lines.every((line) => ctx.measureText(line).width <= maxWidth);
    if (lines.length <= TEXT_MAX_LINES && fitsWidth) break;
  }

  const lineHeight = Math.round(fontSize * 1.22);
  const barHeight = lines.length * lineHeight + TEXT_PADDING * 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, barHeight);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, TEXT_PADDING + lineHeight * (index + 0.5), maxWidth);
  });
}

/**
 * Jedyna funkcja rysująca klatkę. Używają jej i podgląd, i eksport (eksport
 * nagrywa ten sam canvas), więc pobrany plik wygląda identycznie jak podgląd.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, input: FrameInput) {
  const { video, face, pose, text } = input;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const { videoWidth, videoHeight } = video;
  if (videoWidth > 0 && videoHeight > 0) {
    // Dopasowanie "cover": klip wypełnia kadr 9:16, nadmiar jest przycinany.
    const {
      x: offsetX,
      y: offsetY,
      width: drawnWidth,
      height: drawnHeight,
    } = coverRect(video);
    ctx.drawImage(video, offsetX, offsetY, drawnWidth, drawnHeight);

    if (face && pose) {
      const faceWidth = pose.scale * drawnWidth * HEAD_WIDTH_PER_EYE_DISTANCE * OVERSIZE;
      const faceHeight = faceWidth * (face.height / face.width);

      ctx.save();
      ctx.translate(offsetX + pose.x * drawnWidth, offsetY + pose.y * drawnHeight);
      ctx.rotate(pose.rotation);
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(face, -faceWidth / 2, -faceHeight / 2, faceWidth, faceHeight);
      ctx.restore();
    }
  }

  if (text.trim()) drawCaption(ctx, text.trim());
}
