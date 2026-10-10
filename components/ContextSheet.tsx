"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, ExternalLink, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { MemeSource } from "@/lib/schemas";

function SourceItem({ source }: { source: MemeSource }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-xl bg-zinc-800/60">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="rounded-md bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
          {source.id}
        </span>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-1 text-sm text-violet-300 hover:underline"
        >
          <span className="truncate">{source.title}</span>
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </a>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Ukryj cytat" : "Pokaż cytat"}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
        >
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.blockquote
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="border-l-2 border-violet-500 mx-3 mb-3 pl-3 text-sm text-zinc-300 italic">
              „{source.quote}”
            </p>
          </motion.blockquote>
        )}
      </AnimatePresence>
    </li>
  );
}

interface ContextSheetProps {
  shortContext: string;
  sources: MemeSource[];
  /** null = brak eksportu w toku, 0..1 = postęp nagrywania. */
  exportProgress: number | null;
  exportError: string | null;
  onDownload: () => void;
}

export function ContextSheet({
  shortContext,
  sources,
  exportProgress,
  exportError,
  onDownload,
}: ContextSheetProps) {
  const [open, setOpen] = useState(true);
  const exporting = exportProgress !== null;

  return (
    <motion.section
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-3xl border-t border-zinc-800 bg-zinc-900/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur"
    >
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onPanEnd={(_, info) => {
          if (Math.abs(info.offset.y) > 30) setOpen(info.offset.y < 0);
        }}
        aria-expanded={open}
        className="flex w-full touch-none flex-col items-center gap-2 px-5 pt-2.5 pb-3 text-left"
      >
        <span className="h-1 w-10 rounded-full bg-zinc-700" />
        <span className="w-full text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Kontekst historyczny
        </span>
        {!open && <span className="line-clamp-1 w-full text-sm text-zinc-300">{shortContext}</span>}
      </motion.button>

      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="overflow-hidden"
      >
        <div className="flex max-h-[55dvh] flex-col gap-4 overflow-y-auto px-5 pb-5">
          <p className="text-base leading-relaxed text-zinc-100">{shortContext}</p>

          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Źródła</h2>
            <ul className="flex flex-col gap-1.5">
              {sources.map((source, index) => (
                <SourceItem key={`${source.id}-${index}`} source={source} />
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={onDownload}
            disabled={exporting}
            className="relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-300"
          >
            {exporting && (
              <span
                className="absolute inset-y-0 left-0 bg-violet-600 transition-[width] duration-200"
                style={{ width: `${Math.round(exportProgress * 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(exportProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            )}
            <span className="relative flex items-center gap-2">
              {exporting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              {exporting
                ? `Nagrywam… ${Math.round(exportProgress * 100)}%`
                : "Pobierz Mema (Wideo)"}
            </span>
          </button>
          {exportError && <p className="text-sm text-red-400">{exportError}</p>}
        </div>
      </motion.div>
    </motion.section>
  );
}
