import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { ANALYZE_SYSTEM_PROMPT, buildAnalyzeText } from "@/lib/analyzePrompt";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import {
  ClipAnalysisSchema,
  LlmOutputSchema,
  type ClipAnalysis,
  type LlmOutput,
} from "@/lib/schemas";

const MODEL = process.env.LLM_MODEL ?? "claude-opus-5-5";

export class LlmError extends Error {}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new LlmError("Brak ANTHROPIC_API_KEY w zmiennych środowiskowych.");
  }
  client ??= new Anthropic();
  return client;
}

type UserContent = Anthropic.Beta.BetaMessageParam["content"];

async function callStructured<Schema extends z.ZodType>(
  schema: Schema,
  system: string,
  content: UserContent,
): Promise<z.infer<Schema>> {
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content }],
      // Ten model nie przyjmuje temperature; rolę "niskiej temperatury" pełni
      // niski effort plus twarda weryfikacja cytatów po stronie backendu.
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(schema),
      },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") {
      throw new LlmError("Model odmówił wygenerowania odpowiedzi.");
    }
    if (!response.parsed_output) {
      throw new LlmError(
        `Model nie zwrócił poprawnego JSON-a (stop_reason: ${response.stop_reason}).`,
      );
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof LlmError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new LlmError("Nieprawidłowy klucz API LLM.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new LlmError("Limit zapytań do LLM został przekroczony. Spróbuj za chwilę.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new LlmError("Brak połączenia z dostawcą LLM.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new LlmError(`Błąd API LLM (${error.status}): ${error.message}`);
    }
    throw error;
  }
}

export function generateMeme(userPrompt: string): Promise<LlmOutput> {
  return callStructured(LlmOutputSchema, SYSTEM_PROMPT, userPrompt);
}

/** Analiza klipu: klatki (JPEG base64, bez prefiksu data:) + opis. */
export function analyzeClip(input: {
  frames: string[];
  caption: string;
  feedback?: string;
}): Promise<ClipAnalysis> {
  return callStructured(ClipAnalysisSchema, ANALYZE_SYSTEM_PROMPT, [
    ...input.frames.map((data) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
    })),
    { type: "text" as const, text: buildAnalyzeText(input.caption, input.feedback) },
  ]);
}
