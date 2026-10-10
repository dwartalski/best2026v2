import { createFileCache } from "@/lib/fileCache";
import { analyzeClip, LlmError } from "@/lib/llm";
import {
  AnalyzeRequestSchema,
  type AnalyzeResponse,
  type ApiError,
  type ApiErrorCode,
  type ClipAnalysis,
  type ImportedTemplate,
} from "@/lib/schemas";
import { matchesTemplate } from "@/lib/verify";

export const maxDuration = 60;

const analysisCache = createFileCache<ClipAnalysis>("analyses");

function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

/** textTemplate musi powstać z originalText przez samą zamianę fragmentów na luki. */
function templateProblem(analysis: ClipAnalysis): string | null {
  const { originalText, textTemplate } = analysis;
  if (!originalText.trim() || originalText.length > 300) {
    return "originalText musi mieć od 1 do 300 znaków.";
  }
  if (!/\[[^\]]+\]/.test(textTemplate)) return "textTemplate nie zawiera żadnej luki w nawiasach.";
  if (/\]\s*\[/.test(textTemplate)) return "Luki w textTemplate nie mogą ze sobą sąsiadować.";
  if (!matchesTemplate(originalText, textTemplate)) {
    return "originalText nie pasuje do textTemplate: słowa poza lukami muszą być identyczne.";
  }
  return null;
}

function toTemplate(importId: string, author: string | undefined, analysis: ClipAnalysis): ImportedTemplate {
  const vibe = analysis.vibe.map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 6);
  return {
    id: `import_${importId}`,
    // Dla wgranych plików (f_) klip istnieje tylko w przeglądarce, która podstawia własny URL.
    videoUrl: importId.startsWith("u_") ? `/api/imports/${importId}` : "",
    title: author ? `Klip od ${author}` : "Zaimportowany klip",
    vibe: vibe.length > 0 ? vibe : ["reakcja"],
    originalText: analysis.originalText.trim(),
    textTemplate: analysis.textTemplate.trim(),
    source: "imported",
  };
}

export async function POST(request: Request) {
  const parsed = AnalyzeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("INVALID_REQUEST", "Nieprawidłowe dane do analizy klipu.", 400);
  }
  const { importId, frames, caption, author } = parsed.data;

  const cached = await analysisCache.get(importId);
  if (cached) {
    return Response.json({
      template: toTemplate(importId, author, cached),
      analysis: cached,
      cached: true,
    } satisfies AnalyzeResponse);
  }

  const images = frames.map((frame) => frame.slice(frame.indexOf(",") + 1));
  try {
    let feedback: string | undefined;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const analysis = await analyzeClip({ frames: images, caption, feedback });
      feedback = templateProblem(analysis) ?? undefined;
      if (!feedback) {
        await analysisCache.set(importId, analysis);
        return Response.json({
          template: toTemplate(importId, author, analysis),
          analysis,
          cached: false,
        } satisfies AnalyzeResponse);
      }
      console.warn(`[analyze] odrzucony szablon (próba ${attempt}):`, feedback);
    }
    return errorResponse(
      "ANALYSIS_FAILED",
      "Nie udało się zbudować szablonu z tego klipu. Spróbuj innego.",
      422,
    );
  } catch (error) {
    if (error instanceof LlmError) return errorResponse("LLM_ERROR", error.message, 502);
    console.error("[analyze]", error);
    return errorResponse("LLM_ERROR", "Nieoczekiwany błąd analizy.", 500);
  }
}
