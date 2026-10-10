import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { importVideoPath } from "@/lib/importStore";
import { ImportIdSchema } from "@/lib/schemas";

/** Wydaje pobrany klip. Obsługuje nagłówek Range, bez którego Safari nie odtworzy wideo. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = ImportIdSchema.safeParse((await params).id);
  if (!id.success) return new Response("Not found", { status: 404 });

  const filePath = importVideoPath(id.data);
  const file = await stat(filePath).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  let start = 0;
  let end = file.size - 1;
  let status = 200;
  if (range && (range[1] || range[2])) {
    if (range[1]) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(Number(range[2]), end);
    } else {
      start = Math.max(file.size - Number(range[2]), 0);
    }
    if (start > end) {
      headers.set("Content-Range", `bytes */${file.size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
    status = 206;
  }
  headers.set("Content-Length", String(end - start + 1));

  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
  return new Response(stream, { status, headers });
}
