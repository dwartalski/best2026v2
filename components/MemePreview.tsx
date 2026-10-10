"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH, canvasToVideoPoint, drawFrame } from "@/lib/drawFrame";
import { loadFaceSticker } from "@/lib/faceSticker";
import { FaceTracker, loadFaceLandmarker, type FacePose } from "@/lib/faceTracker";
import type { Character, MemeTemplate } from "@/lib/schemas";

const DEFAULT_MANUAL_POSE: FacePose = { x: 0.5, y: 0.4, scale: 0.18, rotation: 0 };
const MANUAL_SCALE_RANGE = { min: 0.05, max: 0.5 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export interface MemePreviewHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getVideo: () => HTMLVideoElement | null;
}

interface MemePreviewProps {
  ref?: Ref<MemePreviewHandle>;
  template: MemeTemplate;
  /** null = klip bez wklejonej twarzy (przed wygenerowaniem mema). */
  character: Character | null;
  text: string;
  /** Blokuje sterowanie odtwarzaniem na czas eksportu. */
  locked?: boolean;
  /** Plakietka w rogu podglądu, np. "🔗 Z linku". */
  badge?: string;
  /** Tapnięcie w podgląd wybiera twarz do podmiany (klipy z kilkoma twarzami). */
  pickFace?: boolean;
  /** Wklejka ustawiana ręcznie (przeciąganie + skala), statycznie na cały klip. */
  manual?: boolean;
}

export function MemePreview({
  ref,
  template,
  character,
  text,
  locked,
  badge,
  pickFace,
  manual = false,
}: MemePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<FaceTracker>(new FaceTracker(null, template.faceKeyframes));
  const stickerRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef(text);
  const manualRef = useRef(manual);
  const manualPoseRef = useRef<FacePose>(DEFAULT_MANUAL_POSE);
  // Aktywne palce na canvasie: jeden przeciąga wklejkę, dwa ją skalują (pinch).
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());

  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [manualScale, setManualScale] = useState(DEFAULT_MANUAL_POSE.scale);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getVideo: () => videoRef.current,
  }));

  const render = useCallback(() => {
    const video = videoRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!video || !ctx) return;
    const face = stickerRef.current;
    const pose = !face
      ? null
      : manualRef.current
        ? manualPoseRef.current
        : trackerRef.current.track(video);
    drawFrame(ctx, { video, face, pose, text: textRef.current });
  }, []);

  // Pętla rysowania: jedna klatka canvasu na każdą klatkę wideo.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancel: () => void;
    if ("requestVideoFrameCallback" in video) {
      let id = video.requestVideoFrameCallback(function tick() {
        render();
        id = video.requestVideoFrameCallback(tick);
      });
      cancel = () => video.cancelVideoFrameCallback(id);
    } else {
      let id = requestAnimationFrame(function tick() {
        render();
        id = requestAnimationFrame(tick);
      });
      cancel = () => cancelAnimationFrame(id);
    }

    // Gdy klip stoi, rVFC nie odpala; te zdarzenia odświeżają klatkę ręcznie.
    video.addEventListener("loadeddata", render);
    video.addEventListener("seeked", render);
    return () => {
      cancel();
      video.removeEventListener("loadeddata", render);
      video.removeEventListener("seeked", render);
    };
  }, [render]);

  // Do czasu załadowania modelu (lub gdy się nie załaduje) działają same klatki kluczowe.
  useEffect(() => {
    let cancelled = false;
    loadFaceLandmarker()
      .then((landmarker) => {
        if (!cancelled) {
          trackerRef.current = new FaceTracker(landmarker, template.faceKeyframes);
        }
      })
      .catch((error) => console.warn("[MemePreview] MediaPipe niedostępny:", error));
    return () => {
      cancelled = true;
    };
  }, [template.faceKeyframes]);

  useEffect(() => {
    let cancelled = false;
    if (!character) {
      stickerRef.current = null;
      render();
      return;
    }
    void loadFaceSticker(character).then((sticker) => {
      if (cancelled) return;
      stickerRef.current = sticker;
      render();
    });
    return () => {
      cancelled = true;
    };
  }, [character, render]);

  useEffect(() => {
    textRef.current = text;
    manualRef.current = manual;
    render();
  }, [text, manual, render]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || locked) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  /** Pozycja wskaźnika we współrzędnych klatki wideo (0..1). */
  const videoPoint = (event: ReactPointerEvent | React.MouseEvent) => {
    const video = videoRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!video || !rect) return null;
    return canvasToVideoPoint(video, {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  const setManualPose = (patch: Partial<FacePose>) => {
    manualPoseRef.current = { ...manualPoseRef.current, ...patch };
    render();
  };

  const updateManualScale = (scale: number) => {
    const clamped = clamp(scale, MANUAL_SCALE_RANGE.min, MANUAL_SCALE_RANGE.max);
    setManualScale(clamped);
    setManualPose({ scale: clamped });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!manual || locked || !character) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const point = videoPoint(event);
    if (point && pointersRef.current.size === 1) {
      setManualPose({ x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) });
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!manual || !previous) return;

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [c, d] = [...pointers.values()];
      const after = Math.hypot(c.x - d.x, c.y - d.y);
      if (before > 0) updateManualScale(manualPoseRef.current.scale * (after / before));
      return;
    }

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const point = videoPoint(event);
    if (point) setManualPose({ x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) });
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (manual && character) return;
    const point = pickFace && character && !locked ? videoPoint(event) : null;
    if (point) {
      trackerRef.current.pickFaceAt(point);
      render();
    } else {
      togglePlayback();
    }
  };

  const hint =
    !character || locked
      ? null
      : manual
        ? "Przeciągnij twarz na miejsce"
        : pickFace
          ? "Tapnij twarz, którą chcesz podmienić"
          : null;

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-zinc-800">
      <video
        ref={videoRef}
        src={template.videoUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setVideoError(true)}
        className="absolute inset-0 size-full object-cover"
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className={`absolute inset-0 size-full ${
          manual && character ? "cursor-move touch-none" : "cursor-pointer"
        }`}
      />

      {videoError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-6 text-center text-sm text-zinc-400">
          {template.source === "imported"
            ? "Przeglądarka nie potrafi odtworzyć tego klipu. Spróbuj wgrać plik MP4 (H.264)."
            : `Nie udało się wczytać klipu ${template.videoUrl}. Dodaj plik do /public/templates.`}
        </div>
      ) : (
        <>
          {!playing && !locked && !manual && !pickFace && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/60 p-4">
                <Play className="size-8 fill-white text-white" aria-hidden />
              </span>
            </div>
          )}

          {badge && (
            <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {badge}
            </span>
          )}

          <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
            {hint && (
              <span className="pointer-events-none rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur">
                {hint}
              </span>
            )}
            {manual && character && !locked && (
              <label className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
                Rozmiar
                <input
                  type="range"
                  min={MANUAL_SCALE_RANGE.min}
                  max={MANUAL_SCALE_RANGE.max}
                  step={0.005}
                  value={manualScale}
                  onChange={(event) => updateManualScale(Number(event.target.value))}
                  className="w-28 accent-violet-500"
                />
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked}
                onClick={togglePlayback}
                aria-label={playing ? "Pauza" : "Odtwórz"}
                className="rounded-full bg-black/60 p-2.5 text-white backdrop-blur disabled:opacity-40"
              >
                {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => setMuted((value) => !value)}
                aria-label={muted ? "Włącz dźwięk" : "Wycisz"}
                className="rounded-full bg-black/60 p-2.5 text-white backdrop-blur disabled:opacity-40"
              >
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
