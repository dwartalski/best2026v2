import { characters } from "@/data/characters";
import { templateById, templates } from "@/data/templates";
import { createFileCache } from "@/lib/fileCache";
import { generateMeme, LlmError } from "@/lib/llm";
import { matchCharacter, normalizeForMatch } from "@/lib/matchCharacter";
import { buildRetryPrompt, buildUserPrompt } from "@/lib/prompt";
import {
  GenerateRequestSchema,
  type ApiError,
  type ApiErrorCode,
  type GenerateResponse,
} from "@/lib/schemas";
import { collectSources } from "@/lib/sources";
import { verifyOutput, type VerifyContext } from "@/lib/verify";

export const maxDuration = 60;

// Ponowne kliknięcie z tymi samymi danymi nie woła LLM drugi raz.
const generationCache = createFileCache<GenerateResponse>("generations");

function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Nieprawidłowe żądanie.",
      400,
    );
  }
  const { mode, userInput, templateId, customTemplate } = parsed.data;

  // Tryb link: jedynym dostępnym szablonem jest tymczasowy szablon z /api/analyze.
  const availableTemplates = customTemplate ? [customTemplate] : templates;
  const requiredTemplateId = customTemplate?.id ?? (mode === "text" ? undefined : templateId);
  if (requiredTemplateId && !customTemplate && !templateById.has(requiredTemplateId)) {
    return errorResponse("TEMPLATE_NOT_FOUND", "Nie ma takiego szablonu.", 404);
  }

  // Tryb text wymaga dopasowania tematu do postaci. W hybrid i link dopasowanie
  // tylko zawęża wybór; bez niego (i w trybie video) postać dobiera model.
  const matched = userInput ? matchCharacter(userInput, characters) : null;
  if (mode === "text" && !matched) {
    return errorResponse(
      "CHARACTER_NOT_FOUND",
      `Nie mamy jeszcze w bazie postaci pasującej do tematu „${userInput}”. Dostępne: ${characters.map((c) => c.name).join(", ")}.`,
      404,
    );
  }
  const candidates = matched ? [matched] : characters;

  const cacheKey = [
    requiredTemplateId ?? "any",
    // Tekst szablonów w kluczu unieważnia cache po edycji szablonu lub nowej analizie klipu.
    availableTemplates.map((t) => t.textTemplate).join("~"),
    matched?.id ?? "auto",
    normalizeForMatch(userInput ?? ""),
  ].join("|");
  const cachedResponse = await generationCache.get(cacheKey);
  if (cachedResponse) return Response.json(cachedResponse);

  // Źródła zbieramy PRZED wywołaniem LLM: model widzi wyłącznie te teksty.
  const sources = await collectSources(candidates);
  const context: VerifyContext = {
    sources,
    templates: availableTemplates,
    allowedCharacterIds: candidates.map((c) => c.id),
    requiredTemplateId,
  };
  const basePrompt = buildUserPrompt({
    mode,
    userInput,
    templates: availableTemplates,
    characters: candidates,
    sources,
    requiredTemplateId,
  });

  try {
    let prompt = basePrompt;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const output = await generateMeme(prompt);

      if (output.insufficientSources) {
        return Response.json({
          templateId: requiredTemplateId ?? output.templateId,
          characterId: output.characterId,
          memeText: "",
          shortContext: "",
          sources: [],
          insufficientSources: true,
        } satisfies GenerateResponse);
      }

      const result = verifyOutput(output, context);
      if (result.ok) {
        const response: GenerateResponse = {
          templateId: output.templateId,
          characterId: output.characterId,
          memeText: output.memeText.trim(),
          shortContext: output.shortContext.trim(),
          sources: result.sources,
          insufficientSources: false,
        };
        await generationCache.set(cacheKey, response);
        return Response.json(response);
      }

      console.warn(`[generate] weryfikacja nieudana (próba ${attempt}):`, result.errors);
      prompt = buildRetryPrompt(basePrompt, output, result.errors);
    }

    return errorResponse(
      "VERIFICATION_FAILED",
      "Nie udało się potwierdzić faktów w źródłach, więc nie pokazujemy mema. Spróbuj ponownie lub zmień temat.",
      422,
    );
  } catch (error) {
    if (error instanceof LlmError) {
      return errorResponse("LLM_ERROR", error.message, 502);
    }
    console.error("[generate]", error);
    return errorResponse("LLM_ERROR", "Nieoczekiwany błąd generowania.", 500);
  }
}
