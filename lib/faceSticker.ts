import type { Character } from "@/lib/schemas";

const STICKER_HEIGHT = 512;
const OUTLINE = 10;

const stickerCache = new Map<string, Promise<HTMLCanvasElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Nie udało się wczytać ${url}`));
    image.src = url;
  });
}

/** Zastępcza "twarz", gdy w /public/faces nie ma jeszcze pliku PNG. */
function drawPlaceholder(character: Character): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = STICKER_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#f2c79b";
  ctx.beginPath();
  ctx.ellipse(200, 256, 190, 246, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1c1917";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 44px Arial, Helvetica, sans-serif";
  character.name.split(" ").forEach((word, index, words) => {
    ctx.fillText(word, 200, 256 + (index - (words.length - 1) / 2) * 52, 340);
  });
  return canvas;
}

/**
 * Dodaje biały obrys w stylu naklejki: sylwetka obrazka odbita po okręgu,
 * zamalowana na biało, a na niej oryginał. Liczone raz na postać.
 */
function addOutline(image: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width + OUTLINE * 2;
  canvas.height = height + OUTLINE * 2;
  const ctx = canvas.getContext("2d")!;

  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
    ctx.drawImage(
      image,
      OUTLINE + Math.cos(angle) * OUTLINE,
      OUTLINE + Math.sin(angle) * OUTLINE,
      width,
      height,
    );
  }
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(image, OUTLINE, OUTLINE, width, height);
  return canvas;
}

async function createSticker(character: Character): Promise<HTMLCanvasElement> {
  try {
    const image = await loadImage(character.faceImageUrl);
    const width = Math.round(STICKER_HEIGHT * (image.naturalWidth / image.naturalHeight));
    return addOutline(image, width, STICKER_HEIGHT);
  } catch {
    const placeholder = drawPlaceholder(character);
    return addOutline(placeholder, placeholder.width, placeholder.height);
  }
}

export function loadFaceSticker(character: Character): Promise<HTMLCanvasElement> {
  let sticker = stickerCache.get(character.id);
  if (!sticker) {
    sticker = createSticker(character);
    stickerCache.set(character.id, sticker);
  }
  return sticker;
}
