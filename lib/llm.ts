import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { LlmOutputSchema, type LlmOutput } from "@/lib/schemas";
import { SYSTEM_PROMPT } from "@/lib/prompt";

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

export async function generateMeme(userPrompt: string): Promise<LlmOutput> {
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      // Ten model nie przyjmuje temperature; rolę "niskiej temperatury" pełni
      // niski effort plus twarda weryfikacja cytatów po stronie backendu.
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(LlmOutputSchema),
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
