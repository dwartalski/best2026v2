import { parseReelUrl } from "@/lib/importLimits";
import { importClip, ImportError } from "@/lib/importStore";
import { ImportRequestSchema, type ApiError, type ApiErrorCode } from "@/lib/schemas";

export const maxDuration = 120;

function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

export async function POST(request: Request) {
  const parsed = ImportRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("INVALID_REQUEST", "Podaj link do klipu.", 400);

  const reel = parseReelUrl(parsed.data.url);
  if (!reel) {
    return errorResponse(
      "UNSUPPORTED_PLATFORM",
      "Nieobsługiwana platforma. Wklej link z Instagram Reels, TikToka lub YouTube Shorts.",
      400,
    );
  }

  try {
    return Response.json(await importClip(reel.url));
  } catch (error) {
    if (error instanceof ImportError) {
      return errorResponse(error.code, error.message, error.status);
    }
    console.error("[import]", error);
    return errorResponse("IMPORT_FAILED", "Nie udało się pobrać klipu.", 500);
  }
}
