"use client";

import { Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawFrame } from "@/lib/drawFrame";
import { loadFaceSticker } from "@/lib/faceSticker";
import { FaceTracker, loadFaceLandmarker } from "@/lib/faceTracker";
import type { Character, MemeTemplate } from "@/lib/schemas";

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
}

export function MemePreview({ ref, template, character, text, locked }: MemePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<FaceTracker>(new FaceTracker(null, template.faceKeyframes));
  const stickerRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef(text);

  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getVideo: () => videoRef.current,
  }));

  const render = useCallback(() => {
    const video = videoRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!video || !ctx) return;
    const face = stickerRef.current;
    drawFrame(ctx, {
      video,
      face,
      pose: face ? trackerRef.current.track(video) : null,
      text: textRef.current,
    });
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
    render();
  }, [text, render]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || locked) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

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
        onClick={togglePlayback}
        className="absolute inset-0 size-full cursor-pointer"
      />

      {videoError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-6 text-center text-sm text-zinc-400">
          Nie udało się wczytać klipu {template.videoUrl}. Dodaj plik do /public/templates.
        </div>
      ) : (
        <>
          {!playing && !locked && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/60 p-4">
                <Play className="size-8 fill-white text-white" aria-hidden />
              </span>
            </div>
          )}
          <button
            type="button"
            disabled={locked}
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "Włącz dźwięk" : "Wycisz"}
            className="absolute right-3 bottom-3 rounded-full bg-black/60 p-2.5 text-white backdrop-blur disabled:opacity-40"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        </>
      )}
    </div>
  );
}
